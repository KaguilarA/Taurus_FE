import { computed, Injectable, signal } from '@angular/core';
import type { OrderScope, OrderSubscription, ProductType, Role, State } from './interfaces';
import { openOrderSocket } from './order-socket';
export const themeAccent = (value?: string) => value || '#F5A623';
export const categoryName = (category: string) =>
  ({ food: 'Comida', drink: 'Bebida', snack: 'Snacks y botanas', liquor: 'Botellas de licor' })[
    category
  ] ?? category;
export const servingName = (serving: string) =>
  ({ large: 'Grande', small: 'Pequeño', shot: 'Shot', unit: '' })[serving] ?? serving;
@Injectable({ providedIn: 'root' })
export class Api {
  private readonly slowReads = signal(0);
  public readonly connecting = computed(() => this.slowReads() > 0);
  private readonly pendingReads = new Map<string, Promise<unknown>>();
  public readonly state = signal<State | null>(null);
  public readonly productTypes = signal<ProductType[]>([]);
  public readonly authenticated = signal(false);
  public readonly role = signal<Role | null>(null);
  public async request<T>(
    path: string,
    method = 'GET',
    body?: unknown,
    options: {
      signal?: AbortSignal;
    } = {},
  ): Promise<T> {
    if (method !== 'GET') this.pendingReads.clear();
    if (method !== 'GET' || body !== undefined || options.signal)
      return this.performRequest<T>(path, method, body, options);
    const pending = this.pendingReads.get(path);
    if (pending) return pending as Promise<T>;
    const request = this.performRequest<T>(path, method, body, options).finally(() => {
      if (this.pendingReads.get(path) === request) this.pendingReads.delete(path);
    });
    this.pendingReads.set(path, request);
    return request;
  }
  private async performRequest<T>(
    path: string,
    method: string,
    body: unknown,
    options: { signal?: AbortSignal },
  ): Promise<T> {
    const read = method === 'GET';
    let slow = false;
    const indicator = read
      ? setTimeout(() => {
          slow = true;
          this.slowReads.update((count) => count + 1);
        }, 5000)
      : undefined;
    try {
      for (let attempt = 0; ; attempt++) {
        options.signal?.throwIfAborted();
        const controller = new AbortController();
        const timeout = read ? setTimeout(() => controller.abort(), 25000) : undefined;
        const signal = read
          ? options.signal
            ? AbortSignal.any([options.signal, controller.signal])
            : controller.signal
          : options.signal;
        let response: Response | undefined;
        try {
          const multipart = body instanceof FormData;
          response = await fetch('/api' + path, {
            method,
            signal,
            credentials: 'include',
            headers: body && !multipart ? { 'Content-Type': 'application/json' } : {},
            body: multipart ? body : body ? JSON.stringify(body) : undefined,
          });
        } catch (reason) {
          if (options.signal?.aborted) throw reason;
          if (!read || attempt >= 2)
            throw new Error('No hay conexión con el servidor. Volvé a intentar en un momento.');
        } finally {
          clearTimeout(timeout);
        }
        const retryAfter = Number(response?.headers.get('Retry-After') ?? 0);
        if (
          read &&
          attempt < 2 &&
          (!response || [429, 502, 503, 504].includes(response.status)) &&
          retryAfter <= 15
        ) {
          // Only reads can be replayed. Never repeat an order, payment, login or upload.
          await response?.body?.cancel();
          await this.waitForRetry(
            Math.max(retryAfter * 1000, attempt === 0 ? 15000 : 30000),
            options.signal,
          );
          continue;
        }
        if (!response) throw new Error('No hay conexión con el servidor. Volvé a intentar.');
        const data = await response.json().catch(() => ({}));
        if (!response.ok) {
          if (response.status === 401) this.authenticated.set(false);
          throw new Error(
            data.error ??
              ([429, 502, 503, 504].includes(response.status)
                ? 'El servidor está temporalmente ocupado. Volvé a intentar en un momento.'
                : 'No se pudo completar la operación.'),
          );
        }
        return data as T;
      }
    } finally {
      clearTimeout(indicator);
      if (slow) this.slowReads.update((count) => count - 1);
    }
  }
  private waitForRetry(milliseconds: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const abort = (): void => {
        clearTimeout(timer);
        signal?.removeEventListener('abort', abort);
        reject(signal?.reason);
      };
      const timer = setTimeout(() => {
        signal?.removeEventListener('abort', abort);
        resolve();
      }, milliseconds);
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort();
    });
  }
  public uploadImage(
    file: File,
    purpose: 'product' | 'promotion' | 'event' | 'branding',
  ): Promise<{
    url: string;
    optimization?: { originalBytes: number; optimizedBytes: number; savedBytes: number };
  }> {
    const form = new FormData();
    form.append('image', file);
    return this.request<{
      url: string;
      optimization?: {
        originalBytes: number;
        optimizedBytes: number;
        savedBytes: number;
      };
    }>('/admin/images?purpose=' + purpose, 'POST', form);
  }
  public async load(): Promise<void> {
    const state = await this.request<State>('/admin/state');
    if (state.settings) state.settings.accent = themeAccent(state.settings.accent);
    this.state.set(state);
    this.productTypes.set(state.productTypes ?? []);
  }
  public async status(): Promise<void> {
    const status = await this.request<{
      authenticated: boolean;
      role: Role | null;
    }>('/auth/status');
    this.authenticated.set(status.authenticated);
    this.role.set(status.role);
  }
  public async login(username: string, password: string): Promise<void> {
    const status = await this.request<{
      role: Role;
    }>('/auth/login', 'POST', {
      username,
      password,
    });
    this.role.set(status.role);
    this.authenticated.set(true);
    await this.load();
  }
  public async logout(): Promise<void> {
    await this.request('/auth/logout', 'POST');
    this.authenticated.set(false);
    this.role.set(null);
    this.state.set(null);
  }
  public money(value: number, currency = this.state()?.settings.currency ?? 'CRC'): string {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  }
  public orderSocket(
    scope: OrderScope,
    refresh: () => void,
    connection: (connected: boolean) => void,
  ): OrderSubscription {
    return openOrderSocket(scope, refresh, connection);
  }
}
