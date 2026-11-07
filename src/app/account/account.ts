import { DatePipe } from '@angular/common';
import { Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { FormControl, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink, RouterOutlet, UrlTree } from '@angular/router';
import { Api, servingName, themeAccent } from '../api';
import { Icon } from '../icon';
import type {
  GuestBill,
  MenuItem,
  MenuSelection,
  OrderSubscription,
  PublicState,
  Serving,
} from '../interfaces';
import { MenuComponent } from '../menu';
import { DeferredError } from '../shared/deferred-error';
import { SectionSkeleton } from '../shared/section-skeleton';
import { Button } from '../shared/ui';
import { PageSkeleton } from '../shared/ui/page-skeleton';
@Component({
  selector: 'app-account',
  imports: [
    Button,
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
})
export class AccountPage {
  protected readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  private readonly destroyRef = inject(DestroyRef);
  public readonly data = signal<PublicState | null>(null);
  public readonly error = signal('');
  public readonly servingName = servingName;
  public readonly addFromDetails = (selection: MenuSelection): void =>
    this.add(selection.product, selection.serving);
  public readonly search = new FormControl('', { nonNullable: true });
  public readonly matches = signal<
    {
      _id: string;
      label: string;
      createdAt: string;
    }[]
  >([]);
  public readonly searching = signal(false);
  public readonly changingAccount = signal(false);
  public readonly searched = signal(false);
  private searchRequest?: AbortController;
  public async searchAccounts(): Promise<void> {
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
      const matches = await this.api.request<
        {
          _id: string;
          label: string;
          createdAt: string;
        }[]
      >('/public/accounts?q=' + encodeURIComponent(query), 'GET', undefined, {
        signal: request.signal,
      });
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
  public async selectAccount(id: string): Promise<void> {
    if (this.busy()) return;
    this.busy.set(true);
    this.changingAccount.set(true);
    this.error.set('');
    try {
      const bill = await this.api.request<GuestBill>('/public/accounts/' + encodeURIComponent(id));
      if (this.destroyRef.destroyed) return;
      this.stopWatching();
      this.tableToken.set(null);
      this.bill.set(bill);
      this.cart.set([]);
      this.notes.set('');
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
  public readonly bill = signal<GuestBill | null>(null);
  public readonly cart = signal<
    {
      product: MenuItem;
      serving: Serving | 'unit';
      quantity: number;
      price: number;
    }[]
  >([]);
  public readonly total = computed(() =>
    this.cart().reduce((sum, line) => sum + line.price * line.quantity, 0),
  );
  public readonly busy = signal(false);
  public readonly notice = signal('');
  public readonly connected = signal(false);
  public readonly tableToken = signal(this.route.snapshot.queryParamMap.get('mesa'));
  private readonly billToken = this.route.snapshot.queryParamMap.get('cuenta');
  public readonly notes = signal('');
  private requestId = crypto.randomUUID();
  private orderSubscription?: OrderSubscription;
  private subscribedToken = '';
  private discovering = false;
  private refreshVersion = 0;
  private refreshTimer?: ReturnType<typeof setInterval>;
  public readonly statusName = (status: string): string =>
    ({
      pending: 'Pedida',
      preparing: 'En preparación',
      ready: 'Por servir',
      delivered: 'Servida',
    })[status] ?? status;
  public sectionLink(section: string): UrlTree {
    return this.router.createUrlTree(['/cuenta'], {
      queryParamsHandling: 'preserve',
      fragment: section,
    });
  }
  constructor() {
    this.load();
    this.destroyRef.onDestroy(() => {
      this.stopWatching();
      this.searchRequest?.abort();
    });
  }
  public async load(): Promise<void> {
    try {
      this.error.set('');
      const data = await this.api.request<PublicState>('/public');
      data.settings.accent = themeAccent(data.settings.accent);
      this.data.set(data);
      this.title.setTitle(`Tu cuenta · ${data.settings.name}`);
      this.meta.updateTag({ name: 'description', content: data.settings.description });
      if (this.tableToken() && !this.bill()) await this.restoreVisit();
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
  public async restoreVisit(): Promise<void> {
    const saved = localStorage.getItem('bill:' + this.tableToken());
    if (saved) {
      try {
        this.bill.set(
          await this.api.request<GuestBill>('/public/bills/' + encodeURIComponent(saved)),
        );
      } catch {
        localStorage.removeItem('bill:' + this.tableToken());
      }
    }
    if (!this.bill()) await this.join();
    else this.watch();
  }
  public async join(): Promise<void> {
    if (!this.tableToken()) return;
    try {
      this.error.set('');
      const bill = await this.api.request<GuestBill>(
        '/public/tables/' + encodeURIComponent(this.tableToken()!) + '/join',
        'POST',
        {},
      );
      this.bill.set(bill);
      localStorage.setItem('bill:' + this.tableToken(), bill.token);
      this.cart.set([]);
      this.watch();
    } catch (e) {
      this.error.set((e as Error).message);
    }
  }
  private stopWatching(): void {
    this.orderSubscription?.close();
    this.orderSubscription = undefined;
    this.subscribedToken = '';
    this.connected.set(false);
    clearInterval(this.refreshTimer);
    this.refreshTimer = undefined;
  }
  private watch(): void {
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
          this.refreshBill();
        },
        (connected) => this.connected.set(connected),
      );
    } else this.orderSubscription.retry();
    if (!this.refreshTimer)
      this.refreshTimer = setInterval(() => {
        if (!this.connected()) this.discoverOrders();
      }, 5000);
  }
  private async discoverOrders(): Promise<void> {
    const bill = this.bill();
    if (!bill || bill.status !== 'open' || this.discovering || this.destroyRef.destroyed) return;
    this.discovering = true;
    try {
      const activity = await this.api.request<{
        hasOrders: boolean;
        closed: boolean;
      }>('/public/bills/' + bill.token + '/activity');
      if (activity.hasOrders || activity.closed) await this.refreshBill();
    } catch {
      this.connected.set(false);
    } finally {
      this.discovering = false;
    }
  }
  public async refreshBill(): Promise<void> {
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
  public add(
    product: MenuItem,
    selectedServing: Serving | 'unit' = product.inventory === 'ml' ? 'shot' : 'unit',
  ): void {
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
  public quantity(index: number, delta: number): void {
    if (this.busy()) return;
    this.cart.update((lines) =>
      lines
        .map((line, i) => ({ ...line, quantity: line.quantity + (i === index ? delta : 0) }))
        .filter((line) => line.quantity > 0),
    );
    this.requestId = crypto.randomUUID();
  }
  public async sendOrder(): Promise<void> {
    if (this.busy() || !this.cart().length) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await this.api.request('/public/bills/' + this.bill()!.token + '/orders', 'POST', {
        requestId: this.requestId,
        notes: this.notes(),
        items: this.cart().map((line) => ({
          productId: line.product._id,
          serving: line.serving,
          quantity: line.quantity,
        })),
      });
      this.cart.set([]);
      this.notes.set('');
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
