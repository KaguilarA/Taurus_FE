import type { MenuPage } from './menu/menu.models';
import { Injectable, signal } from '@angular/core';
import { openOrderSocket, OrderScope } from './order-socket';
export type Serving = 'large' | 'small' | 'shot';
export type Role = 'admin' | 'kitchen' | 'waiter';
export type PaymentMethod = 'cash' | 'sinpe' | 'card';
export const themeAccent = (value?: string) => value || '#F5A623';
export const categoryName = (category: string) =>
  ({ food: 'Comida', drink: 'Bebida', snack: 'Snacks y botanas' })[category] ?? category;
export const servingName = (serving: string) =>
  ({ large: 'Grande', small: 'Pequeño', shot: 'Shot', unit: '' })[serving] ?? serving;
export interface Order extends Sale {
  billId: string;
  orderStatus: 'pending' | 'preparing' | 'ready' | 'delivered';
  notes: string;
}
export interface GuestBill {
  token: string;
  label: string;
  status: 'open' | 'paid';
  total: number;
  balance: number;
  paymentMethod?: PaymentMethod;
  orders: Order[];
}
export interface ServiceBill {
  _id: string;
  label: string;
  total: number;
  status: string;
}
export interface ServiceState {
  bills: ServiceBill[];
  orders: Order[];
}
export interface DiningTable {
  _id: string;
  name: string;
  active: boolean;
  url: string;
  qr: string;
}
export interface StaffAccount {
  _id: string;
  name: string;
  username: string;
  role: Role;
}
export interface Settings {
  name: string;
  subtitle?: string;
  tagline: string;
  description: string;
  heroImage: string;
  logoImage?: string;
  address: string;
  hours: string;
  phone: string;
  currency: string;
  showMenuPrices?: boolean;
  accent: string;
  servings: Record<Serving, number>;
}
export interface Product {
  _id: string;
  name: string;
  description: string;
  image: string;
  category: 'food' | 'drink' | 'snack';
  drinkType?: 'non_alcoholic' | 'alcoholic' | '';
  inventory: 'none' | 'unit' | 'ml';
  price: number;
  prices: Record<Serving, number>;
  bottleMl: number;
  stock: number;
  minimum: number;
  active: boolean;
  featured: boolean;
}
export interface Promotion {
  _id: string;
  title: string;
  description: string;
  image: string;
  starts: string;
  ends: string;
  active: boolean;
}
export interface Sale {
  _id: string;
  label: string;
  total: number;
  status: string;
  createdAt: string;
  billId?: string;
  paymentMethod?: PaymentMethod;
  items: {
    name: string;
    category?: Product['category'];
    fulfillmentStatus?: Order['orderStatus'];
    serving: string;
    quantity: number;
    amount: number;
  }[];
}
export interface Movement {
  _id: string;
  productName: string;
  delta: number;
  unit: string;
  reason: string;
  balance: number;
  createdAt: string;
}
export interface State {
  settings: Settings;
  products: Product[];
  promotions: Promotion[];
  sales: Sale[];
  movements: Movement[];
  events?: CalendarEvent[];
}
export interface CalendarEvent {
  _id: string;
  title: string;
  kind: 'music' | 'karaoke' | 'sports' | 'other';
  description: string;
  image: string;
  starts: string | null;
  ends: string | null;
  location: string;
  admission: string;
  active: boolean;
  isSample: boolean;
}
export type PublicState = Pick<State, 'settings' | 'promotions' | 'events'> & { menu: MenuPage };
export interface Report {
  revenue: number;
  count: number;
  ranking: {
    _id: { productId: string; category: string };
    name: string;
    quantity: number;
    revenue: number;
  }[];
}
@Injectable({ providedIn: 'root' })
export class Api {
  readonly state = signal<State | null>(null);
  readonly authenticated = signal(false);
  readonly role = signal<Role | null>(null);
  async request<T>(
    path: string,
    method = 'GET',
    body?: unknown,
    options: { signal?: AbortSignal } = {},
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
  uploadImage(file: File, purpose: 'product' | 'promotion' | 'event' | 'branding') {
    const form = new FormData();
    form.append('image', file);
    return this.request<{
      url: string;
      optimization?: { originalBytes: number; optimizedBytes: number; savedBytes: number };
    }>('/admin/images?purpose=' + purpose, 'POST', form);
  }
  async load() {
    const state = await this.request<State>('/admin/state');
    if (state.settings) state.settings.accent = themeAccent(state.settings.accent);
    this.state.set(state);
  }
  async status() {
    const status = await this.request<{ authenticated: boolean; role: Role | null }>(
      '/auth/status',
    );
    this.authenticated.set(status.authenticated);
    this.role.set(status.role);
  }
  async login(username: string, password: string) {
    const status = await this.request<{ role: Role }>('/auth/login', 'POST', {
      username,
      password,
    });
    this.role.set(status.role);
    this.authenticated.set(true);
    await this.load();
  }
  async logout() {
    await this.request('/auth/logout', 'POST');
    this.authenticated.set(false);
    this.role.set(null);
    this.state.set(null);
  }
  money(value: number, currency = this.state()?.settings.currency ?? 'CRC') {
    return new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency,
      maximumFractionDigits: 2,
    }).format(value);
  }
  orderSocket(scope: OrderScope, refresh: () => void, connection: (connected: boolean) => void) {
    return openOrderSocket(scope, refresh, connection);
  }
}
