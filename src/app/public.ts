import { ProductDetails } from './product-details';
import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { Icon } from './icon';
import {
  Api,
  PublicState,
  CalendarEvent,
  Product,
  Serving,
  GuestBill,
  categoryName,
  servingName,
  themeAccent,
} from './api';
import { IconName } from './icon-names';
import { OrderSubscription } from './order-socket';
import { ScrollReveal } from './scroll-reveal';
@Component({
  selector: 'app-public',
  imports: [RouterLink, FormsModule, DatePipe, Icon, ProductDetails],
  providers: [ScrollReveal],
  templateUrl: './public.html',
})
export class PublicPage {
  readonly reveal = inject(ScrollReveal);
  readonly api = inject(Api);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  readonly data = signal<PublicState | null>(null);
  readonly error = signal('');
  readonly filter = signal('all');
  readonly selectedProduct = signal<Product | null>(null);
  readonly drinkFilter = signal('all');
  readonly categoryName = categoryName;
  readonly servingName = servingName;
  readonly eventIcon = (kind: CalendarEvent['kind']): IconName =>
    ({ music: 'music', karaoke: 'mic-vocal', sports: 'tv', other: 'calendar-days' })[
      kind
    ] as IconName;
  eventWhen(event: CalendarEvent) {
    return event.starts
      ? new Intl.DateTimeFormat('es-CR', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'America/Costa_Rica',
        }).format(new Date(event.starts))
      : 'Fecha por confirmar';
  }
  contactLink() {
    const phone = this.data()
      ?.settings.phone?.split('/')[0]
      .replace(/[^\d+]/g, '');
    return phone ? 'tel:' + phone : this.sectionLink('visitanos');
  }
  readonly bill = signal<GuestBill | null>(null);
  readonly cart = signal<
    { product: Product; serving: Serving | 'unit'; quantity: number; price: number }[]
  >([]);
  readonly total = computed(() =>
    this.cart().reduce((sum, line) => sum + line.price * line.quantity, 0),
  );
  readonly busy = signal(false);
  readonly notice = signal('');
  readonly connected = signal(false);
  readonly tableToken = new URLSearchParams(location.search).get('mesa');
  readonly sizes: { key: Serving; name: string }[] = [
    { key: 'shot', name: 'Shot' },
    { key: 'small', name: 'Pequeño' },
    { key: 'large', name: 'Grande' },
  ];
  selectedServing: Record<string, Serving> = {};
  notes = '';
  private requestId = crypto.randomUUID();
  private orderSubscription?: OrderSubscription;
  private subscribedToken = '';
  private discovering = false;
  private refreshVersion = 0;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private readonly destroyRef = inject(DestroyRef);
  readonly statusName = (status: string) =>
    ({
      pending: 'Recibido',
      preparing: 'En preparación',
      ready: 'Listo para entregar',
      delivered: 'Entregado',
    })[status] ?? status;
  sectionLink(section: string) {
    return location.pathname + location.search + '#' + section;
  }
  readonly products = computed(
    () =>
      this.data()?.products.filter(
        (p) =>
          (this.filter() === 'all' || p.category === this.filter()) &&
          (this.filter() !== 'drink' ||
            this.drinkFilter() === 'all' ||
            p.drinkType === this.drinkFilter()),
      ) ?? [],
  );
  constructor() {
    void this.load();
    this.destroyRef.onDestroy(() => {
      this.stopWatching();
    });
  }
  async load() {
    try {
      this.error.set('');
      const data = await this.api.request<PublicState>('/public');
      data.settings.accent = themeAccent(data.settings.accent);
      this.data.set(data);
      this.title.setTitle(
        `${data.settings.name}${data.settings.subtitle ? ' · ' + data.settings.subtitle : ''}`,
      );
      this.meta.updateTag({ name: 'description', content: data.settings.description });
      if (this.tableToken && !this.bill()) await this.restoreVisit();
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
  async restoreVisit() {
    const saved = localStorage.getItem('bill:' + this.tableToken);
    if (saved) {
      try {
        this.bill.set(
          await this.api.request<GuestBill>('/public/bills/' + encodeURIComponent(saved)),
        );
      } catch {
        localStorage.removeItem('bill:' + this.tableToken);
      }
    }
    if (!this.bill()) await this.join();
    else this.watch();
  }
  async join() {
    try {
      this.error.set('');
      const bill = await this.api.request<GuestBill>(
        '/public/tables/' + encodeURIComponent(this.tableToken!) + '/join',
        'POST',
        {},
      );
      this.bill.set(bill);
      localStorage.setItem('bill:' + this.tableToken, bill.token);
      this.cart.set([]);
      this.watch();
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
  private stopWatching() {
    this.orderSubscription?.close();
    this.orderSubscription = undefined;
    this.subscribedToken = '';
    this.connected.set(false);
    clearInterval(this.refreshTimer);
    this.refreshTimer = undefined;
  }
  private watch() {
    if (this.destroyRef.destroyed) return;
    const bill = this.bill();
    if (!bill || bill.status !== 'open') {
      this.stopWatching();
      return;
    }
    const active = bill.orders.length > 0;
    if (this.subscribedToken && this.subscribedToken !== bill.token) this.stopWatching();
    if (!active) {
      this.orderSubscription?.close();
      this.orderSubscription = undefined;
      this.subscribedToken = '';
      this.connected.set(false);
    } else if (!this.orderSubscription) {
      this.subscribedToken = bill.token;
      this.orderSubscription = this.api.orderSocket(
        { kind: 'bill', token: bill.token },
        () => {
          void this.refreshBill();
        },
        (connected) => this.connected.set(connected),
      );
    } else this.orderSubscription.retry();
    if (!this.refreshTimer)
      this.refreshTimer = setInterval(() => {
        if (!this.connected()) void this.discoverOrders();
      }, 5000);
  }
  private async discoverOrders() {
    const bill = this.bill();
    if (!bill || bill.status !== 'open' || this.discovering || this.destroyRef.destroyed) return;
    this.discovering = true;
    try {
      const activity = await this.api.request<{ hasOrders: boolean; closed: boolean }>(
        '/public/bills/' + bill.token + '/activity',
      );
      if (activity.hasOrders || activity.closed) await this.refreshBill();
    } catch {
      this.connected.set(false);
    } finally {
      this.discovering = false;
    }
  }
  async refreshBill() {
    try {
      const token = this.bill()!.token;
      const version = ++this.refreshVersion;
      const bill = await this.api.request<GuestBill>('/public/bills/' + token);
      if (
        this.bill()?.token === token &&
        version === this.refreshVersion &&
        !this.destroyRef.destroyed
      ) {
        this.bill.set(bill);
        this.watch();
      }
    } catch {
      this.connected.set(false);
    }
  }
  add(product: Product) {
    if (this.busy() || this.bill()?.status !== 'open') return;
    const serving =
      product.inventory === 'ml' ? (this.selectedServing[product._id] ?? 'shot') : 'unit';
    const cart = this.cart().map((line) => ({ ...line }));
    const found = cart.find((line) => line.product._id === product._id && line.serving === serving);
    if (found) found.quantity++;
    else
      cart.push({
        product,
        serving,
        quantity: 1,
        price: serving === 'unit' ? product.price : product.prices[serving],
      });
    this.cart.set(cart);
    this.requestId = crypto.randomUUID();
  }
  quantity(index: number, delta: number) {
    if (this.busy()) return;
    this.cart.update((lines) =>
      lines
        .map((line, i) => ({ ...line, quantity: line.quantity + (i === index ? delta : 0) }))
        .filter((line) => line.quantity > 0),
    );
    this.requestId = crypto.randomUUID();
  }
  async sendOrder() {
    if (this.busy() || !this.cart().length) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await this.api.request('/public/bills/' + this.bill()!.token + '/orders', 'POST', {
        requestId: this.requestId,
        notes: this.notes,
        items: this.cart().map((line) => ({
          productId: line.product._id,
          serving: line.serving,
          quantity: line.quantity,
        })),
      });
      this.cart.set([]);
      this.notes = '';
      this.requestId = crypto.randomUUID();
      this.notice.set('¡Pedido recibido! Podés seguir su estado en tu cuenta.');
      await this.refreshBill();
      document.getElementById('mi-cuenta')?.scrollIntoView?.({ behavior: 'smooth' });
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
}
