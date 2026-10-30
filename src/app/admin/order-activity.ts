import { DestroyRef, Injectable, inject, signal, computed, effect } from '@angular/core';
import { Api, ServiceState } from '../api';
import { OrderSubscription } from '../order-socket';
@Injectable()
export class OrderActivity {
  readonly api = inject(Api);
  readonly error = signal('');
  readonly notice = signal('');
  readonly service = signal<ServiceState>({ bills: [], orders: [] });
  readonly connected = signal(false);
  readonly pending = computed(
    () => this.service().orders.filter((order) => order.orderStatus !== 'delivered').length,
  );
  private orderSubscription?: OrderSubscription;
  private discovering = false;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private serviceVersion = 0;
  private serviceLoaded = false;
  private startVersion = 0;
  private readonly destroyRef = inject(DestroyRef);
  stopWatching() {
    this.startVersion++;
    this.serviceVersion++;
    this.orderSubscription?.close();
    this.orderSubscription = undefined;
    this.connected.set(false);
    clearInterval(this.refreshTimer);
    this.refreshTimer = undefined;
  }
  private syncOrderSubscription() {
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
        void this.refreshService();
      },
      (connected) => this.connected.set(connected),
    );
  }
  private async discoverOrders() {
    if (this.discovering || this.destroyRef.destroyed || !this.api.authenticated()) return;
    this.discovering = true;
    try {
      const activity = await this.api.request<{ hasOrders: boolean }>('/admin/order-activity');
      if (activity.hasOrders || this.service().orders.length) await this.loadService();
    } catch {
      this.connected.set(false);
      if (!this.api.authenticated()) this.stopWatching();
    } finally {
      this.discovering = false;
    }
  }
  private async refreshService() {
    try {
      await this.loadService();
    } catch {
      this.connected.set(false);
      if (!this.api.authenticated()) this.stopWatching();
    }
  }
  async loadService() {
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
  ordersFor(billId: string) {
    return this.service().orders.filter((order) => order.billId === billId);
  }
  canPay(billId: string) {
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
      if (this.api.authenticated()) void this.start();
    });
    void this.start();
  }
  private async start() {
    const version = ++this.startVersion;
    try {
      await this.loadService();
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      if (!this.destroyRef.destroyed && this.api.authenticated() && version === this.startVersion) {
        this.refreshTimer = setInterval(() => {
          if (!this.connected()) void this.discoverOrders();
        }, 5000);
      }
    }
  }
}
