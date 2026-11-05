import { Injectable, signal } from '@angular/core';
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
    const multipart = body instanceof FormData;
    let response: Response;
    try {
      response = await fetch('/api' + path, {
        method,
        signal: options.signal,
        credentials: 'include',
        headers: body && !multipart ? { 'Content-Type': 'application/json' } : {},
        body: multipart ? body : body ? JSON.stringify(body) : undefined,
      });
    } catch (reason) {
      if (options.signal?.aborted) throw reason;
      throw new Error('No hay conexión con el servidor. Verificá que la API esté encendida.');
    }
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) this.authenticated.set(false);
      throw new Error(data.error ?? 'No se pudo completar la operación.');
    }
    return data as T;
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
