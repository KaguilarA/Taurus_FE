import { DestroyRef, Injectable, computed, effect, inject, signal } from '@angular/core';
import { Api } from '../api';
import type { Order, OrderSubscription, ServiceState } from '../interfaces';
@Injectable()
export class OrderActivity {
  private readonly api = inject(Api);
  private readonly destroyRef = inject(DestroyRef);
  public readonly error = signal('');
  public readonly notice = signal('');
  public readonly service = signal<ServiceState>({ bills: [], orders: [] });
  public readonly connected = signal(false);
  public readonly pending = computed(
    () => this.service().orders.filter((order) => order.orderStatus !== 'delivered').length,
  );
  private orderSubscription?: OrderSubscription;
  private discovering = false;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private serviceVersion = 0;
  private serviceLoaded = false;
  private startVersion = 0;
  public stopWatching(): void {
    this.startVersion++;
    this.serviceVersion++;
    this.orderSubscription?.close();
    this.orderSubscription = undefined;
    this.connected.set(false);
    clearInterval(this.refreshTimer);
    this.refreshTimer = undefined;
  }
  private syncOrderSubscription(): void {
    if (this.destroyRef.destroyed) return;
    const active =
      this.api.authenticated() &&
      this.service().orders.some(
        (order) =>
          order.status === 'open' &&
          (this.api.role() !== 'kitchen' || order.orderStatus !== 'delivered'),
      );
    if (!active) {
      this.orderSubscription?.close();
      this.orderSubscription = undefined;
      this.connected.set(false);
      return;
    }
    if (this.orderSubscription) {
      this.orderSubscription.retry();
      return;
    }
    this.orderSubscription = this.api.orderSocket(
      { kind: 'staff' },
      () => {
        this.refreshService();
      },
      (connected) => this.connected.set(connected),
    );
  }
  private async discoverOrders(): Promise<void> {
    if (this.discovering || this.destroyRef.destroyed || !this.api.authenticated()) return;
    this.discovering = true;
    try {
      const activity = await this.api.request<{
        hasOrders: boolean;
      }>('/admin/order-activity');
      if (activity.hasOrders || this.service().orders.length) await this.loadService();
    } catch {
      this.connected.set(false);
      if (!this.api.authenticated()) this.stopWatching();
    } finally {
      this.discovering = false;
    }
  }
  private async refreshService(): Promise<void> {
    try {
      await this.loadService();
    } catch {
      this.connected.set(false);
      if (!this.api.authenticated()) this.stopWatching();
    }
  }
  public async loadService(): Promise<void> {
    const version = ++this.serviceVersion;
    const before = this.service().orders;
    const state = await this.api.request<ServiceState>('/admin/service');
    if (version !== this.serviceVersion || this.destroyRef.destroyed || !this.api.authenticated())
      return;
    this.error.set('');
    const newOrders = state.orders.filter((order) => !before.some((old) => old._id === order._id));
    const ready = state.orders.filter(
      (order) =>
        order.orderStatus === 'ready' &&
        before.some((old) => old._id === order._id && old.orderStatus !== 'ready'),
    );
    if (this.serviceLoaded && newOrders.length)
      this.notice.set(`${newOrders.length} pedido(s) nuevo(s). Revisá Pedidos en vivo.`);
    if (ready.length) this.notice.set(`${ready.length} pedido(s) listo(s) para entregar.`);
    this.service.set(state);
    this.serviceLoaded = true;
    this.syncOrderSubscription();
  }
  public ordersFor(billId: string): Order[] {
    return this.service().orders.filter((order) => order.billId === billId);
  }
  public canPay(billId: string): boolean {
    const orders = this.ordersFor(billId);
    return orders.length > 0 && orders.every((order) => order.orderStatus === 'delivered');
  }
  constructor() {
    this.destroyRef.onDestroy(() => this.stopWatching());
    let previousRole = this.api.role();
    effect(() => {
      const role = this.api.role();
      if (role === previousRole) return;
      previousRole = role;
      this.stopWatching();
      this.service.set({ bills: [], orders: [] });
      this.serviceLoaded = false;
      if (this.api.authenticated()) this.start();
    });
    this.start();
  }
  private async start(): Promise<void> {
    const version = ++this.startVersion;
    try {
      await this.loadService();
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      if (!this.destroyRef.destroyed && this.api.authenticated() && version === this.startVersion) {
        this.refreshTimer = setInterval(() => {
          if (!this.connected()) this.discoverOrders();
        }, 5000);
      }
    }
  }
}
