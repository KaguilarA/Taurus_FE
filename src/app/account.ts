import { SectionSkeleton } from './shared/section-skeleton';
import { DeferredError } from './shared/deferred-error';
import { MenuComponent } from './menu/menu.component';
import type { MenuItem, MenuSelection } from './menu/menu.models';
import { Component, inject, signal, computed, DestroyRef } from '@angular/core';
import { FormControl, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink, RouterOutlet } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { Icon } from './icon';
import { Api, PublicState, Serving, GuestBill, servingName, themeAccent } from './api';
import { OrderSubscription } from './order-socket';
import { PageSkeleton } from './page-skeleton';
@Component({
  selector: 'app-account',
  imports: [
    RouterLink,
    RouterOutlet,
    FormsModule,
    ReactiveFormsModule,
    DatePipe,
    Icon,
    MenuComponent,
    PageSkeleton,
    SectionSkeleton,
    DeferredError,
  ],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class AccountPage {
  readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  readonly data = signal<PublicState | null>(null);
  readonly error = signal('');
  readonly servingName = servingName;
  readonly addFromDetails = (selection: MenuSelection) =>
    this.add(selection.product, selection.serving);
  readonly search = new FormControl('', { nonNullable: true });
  readonly matches = signal<{ _id: string; label: string; createdAt: string }[]>([]);
  readonly searching = signal(false);
  readonly changingAccount = signal(false);
  readonly searched = signal(false);
  private searchRequest?: AbortController;

  async searchAccounts() {
    const query = this.search.value.trim();
    this.searchRequest?.abort();
    this.matches.set([]);
    this.searched.set(false);
    if (query.length < 2) {
      this.searching.set(false);
      return;
    }
    const request = new AbortController();
    this.searchRequest = request;
    this.searching.set(true);
    this.error.set('');
    try {
      const matches = await this.api.request<{ _id: string; label: string; createdAt: string }[]>(
        '/public/accounts?q=' + encodeURIComponent(query),
        'GET',
        undefined,
        { signal: request.signal },
      );
      if (!request.signal.aborted) {
        this.matches.set(matches);
        this.searched.set(true);
      }
    } catch (error) {
      if (!request.signal.aborted) this.error.set((error as Error).message);
    } finally {
      if (!request.signal.aborted) this.searching.set(false);
    }
  }

  async selectAccount(id: string) {
    if (this.busy()) return;
    this.busy.set(true);
    this.changingAccount.set(true);
    this.error.set('');
    try {
      const bill = await this.api.request<GuestBill>('/public/accounts/' + encodeURIComponent(id));
      if (this.destroyRef.destroyed) return;
      this.stopWatching();
      this.tableToken = null;
      this.bill.set(bill);
      this.cart.set([]);
      this.notes = '';
      this.notice.set('');
      this.requestId = crypto.randomUUID();
      this.matches.set([]);
      this.searched.set(false);
      this.watch();
      await this.router.navigate(['/cuenta'], {
        queryParams: { cuenta: bill.token },
        replaceUrl: true,
      });
    } catch (error) {
      this.error.set((error as Error).message);
    } finally {
      this.busy.set(false);
      this.changingAccount.set(false);
    }
  }
  readonly bill = signal<GuestBill | null>(null);
  readonly cart = signal<
    { product: MenuItem; serving: Serving | 'unit'; quantity: number; price: number }[]
  >([]);
  readonly total = computed(() =>
    this.cart().reduce((sum, line) => sum + line.price * line.quantity, 0),
  );
  readonly busy = signal(false);
  readonly notice = signal('');
  readonly connected = signal(false);
  tableToken = this.route.snapshot.queryParamMap.get('mesa');
  private readonly billToken = this.route.snapshot.queryParamMap.get('cuenta');
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
      pending: 'Pedida',
      preparing: 'En preparación',
      ready: 'Por servir',
      delivered: 'Servida',
    })[status] ?? status;
  sectionLink(section: string) {
    return this.router.url.split('#')[0] + '#' + section;
  }
  constructor() {
    void this.load();
    this.destroyRef.onDestroy(() => {
      this.stopWatching();
      this.searchRequest?.abort();
    });
  }
  async load() {
    try {
      this.error.set('');
      const data = await this.api.request<PublicState>('/public');
      data.settings.accent = themeAccent(data.settings.accent);
      this.data.set(data);
      this.title.setTitle(`Tu cuenta · ${data.settings.name}`);
      this.meta.updateTag({ name: 'description', content: data.settings.description });
      if (this.tableToken && !this.bill()) await this.restoreVisit();
      else if (this.billToken && !this.bill()) {
        this.bill.set(
          await this.api.request<GuestBill>('/public/bills/' + encodeURIComponent(this.billToken)),
        );
        this.watch();
      }
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
    if (!this.tableToken) return;
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
  add(
    product: MenuItem,
    selectedServing: Serving | 'unit' = product.inventory === 'ml' ? 'shot' : 'unit',
  ) {
    if (this.busy() || this.bill()?.status !== 'open') return;
    const serving = product.inventory === 'ml' ? selectedServing : 'unit';
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
