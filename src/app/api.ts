import { computed, Injectable, signal } from '@angular/core';
import type { OrderScope, OrderSubscription, ProductType, Role, State } from './interfaces';
import { reportConnection } from './connection-diagnostics';
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
        if (options.signal?.aborted) throw options.signal.reason;
        const controller = new AbortController();
        const abort = (): void => controller.abort();
        options.signal?.addEventListener('abort', abort, { once: true });
        const timeout = read ? setTimeout(() => controller.abort(), 25000) : undefined;
        let response: Response | undefined;
        let data: unknown;
        let failure = '';
        try {
          const multipart = body instanceof FormData;
          response = await fetch('/api' + path, {
            method,
            signal: controller.signal,
            credentials: 'include',
            headers: body && !multipart ? { 'Content-Type': 'application/json' } : {},
            body: multipart ? body : body ? JSON.stringify(body) : undefined,
          });
          // Keep the deadline active until the complete body has arrived.
          try {
            data = await response.json();
          } catch (reason) {
            if (controller.signal.aborted || response.ok) throw reason;
          }
        } catch (reason) {
          if (options.signal?.aborted) throw reason;
          failure = controller.signal.aborted
            ? 'API_TIMEOUT'
            : response
              ? 'API_INVALID_RESPONSE'
              : 'API_NETWORK';
        } finally {
          clearTimeout(timeout);
          options.signal?.removeEventListener('abort', abort);
        }
        const retryAfter = Number(response?.headers.get('Retry-After') ?? 0);
        const transient =
          !!failure || (!!response && [429, 502, 503, 504].includes(response.status));
        if (read && attempt < 2 && transient && retryAfter <= 15) {
          reportConnection(
            'API_RETRY',
            path,
            response?.status ?? 0,
            response?.headers.get('cf-ray') ?? '',
          );
          await this.waitForRetry(
            Math.max(retryAfter * 1000, attempt === 0 ? 15000 : 30000),
            options.signal,
          );
          continue;
        }
        if (failure || !response) {
          reportConnection(
            failure || 'API_NETWORK',
            path,
            response?.status ?? 0,
            response?.headers.get('cf-ray') ?? '',
          );
          throw new Error(
            'No se pudo completar la conexión con el servidor. Volvé a intentar en un momento.',
          );
        }
        if (!response.ok) {
          if (response.status === 401) this.authenticated.set(false);
          if (response.status >= 500 || response.status === 429)
            reportConnection(
              'API_HTTP',
              path,
              response.status,
              response.headers.get('cf-ray') ?? '',
            );
          const error =
            data && typeof data === 'object' && 'error' in data && typeof data.error === 'string'
              ? data.error
              : '';
          throw new Error(
            error ||
              (transient
                ? 'El servidor está temporalmente ocupado. Volvé a intentar en un momento.'
                : 'No se pudo completar la operación.'),
          );
        }
        reportConnection('API_OK', path);
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
