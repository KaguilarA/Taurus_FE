import { Component, computed, inject, signal, DestroyRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink, Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Icon } from './icon';
import { ImageUpload } from './image-upload';
import { IconName } from './icon-names';
import { OrderSubscription } from './order-socket';
import {
  Api,
  Product,
  Promotion,
  Report,
  Settings,
  Serving,
  ServiceState,
  DiningTable,
  StaffAccount,
  Role,
  PaymentMethod,
  categoryName,
  servingName,
  CalendarEvent,
} from './api';
interface CartLine {
  product: Product;
  serving: Serving | 'unit';
  quantity: number;
  price: number;
}
const blankProduct = (): Product => ({
  _id: '',
  name: '',
  description: '',
  image: '',
  category: 'food',
  inventory: 'none',
  price: 0,
  prices: { large: 0, small: 0, shot: 0 },
  bottleMl: 1000,
  stock: 0,
  minimum: 0,
  active: true,
  featured: false,
});
@Component({
  selector: 'app-admin',
  imports: [FormsModule, RouterLink, DatePipe, Icon, ImageUpload],
  templateUrl: './admin.html',
})
export class AdminPage {
  readonly MathFloor = Math.floor;
  readonly api = inject(Api);
  private readonly title = inject(Title);
  readonly categoryName = categoryName;
  readonly servingName = servingName;
  readonly businessName = signal('Administración');
  private readonly router = inject(Router);
  readonly service = signal<ServiceState>({ bills: [], orders: [] });
  readonly tables = signal<DiningTable[]>([]);
  readonly accounts = signal<StaffAccount[]>([]);
  readonly connected = signal(false);
  readonly roleName = computed(
    () =>
      ({ admin: 'Administrador', kitchen: 'Cocina', waiter: 'Mesero' })[this.api.role() ?? 'admin'],
  );
  readonly nav = computed(() =>
    this.allNav.filter(
      (item) => this.api.role() === 'admin' || ['service', 'profile'].includes(item[0]),
    ),
  );
  readonly pending = computed(
    () => this.service().orders.filter((order) => order.orderStatus === 'pending').length,
  );
  readonly statusName = (status: string) =>
    ({
      pending: 'Recibido',
      preparing: 'En preparación',
      ready: 'Listo para entregar',
      delivered: 'Entregado',
    })[status] ?? status;
  tableName = '';
  staff = { name: '', username: '', password: '', role: 'waiter' as Role };
  paymentMethod: PaymentMethod = 'cash';
  billMethods: Record<string, PaymentMethod> = {};
  billReferences: Record<string, string> = {};
  private orderSubscription?: OrderSubscription;
  private discovering = false;
  private refreshTimer?: ReturnType<typeof setInterval>;
  private serviceVersion = 0;
  private serviceLoaded = false;
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly imageUploading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  readonly tab = signal('overview');
  readonly sidebarExpanded = signal(false);
  readonly search = signal('');
  readonly report = signal<Report>({ revenue: 0, count: 0, ranking: [] });
  readonly cart = signal<CartLine[]>([]);
  readonly total = computed(() =>
    this.cart().reduce((sum, line) => sum + line.price * line.quantity, 0),
  );
  readonly stock = computed(
    () => this.api.state()?.products.filter((p) => p.inventory !== 'none') ?? [],
  );
  readonly low = computed(() => this.stock().filter((p) => p.active && p.stock <= p.minimum));
  readonly filtered = computed(
    () =>
      this.api
        .state()
        ?.products.filter((p) => p.name.toLowerCase().includes(this.search().toLowerCase())) ?? [],
  );
  readonly allNav: [string, IconName, string][] = [
    ['service', 'activity', 'Pedidos en vivo'],
    ['profile', 'users-round', 'Mi perfil'],
    ['overview', 'house', 'Resumen'],
    ['sales', 'shopping-bag', 'Punto de venta'],
    ['inventory', 'package', 'Inventario'],
    ['products', 'utensils', 'Productos'],
    ['promotions', 'sparkles', 'Promociones'],
    ['events', 'calendar-days', 'Eventos'],
    ['reports', 'chart-no-axes-combined', 'Reportes'],
    ['settings', 'settings-2', 'Personalización'],
    ['tables', 'qr-code', 'Mesas y códigos QR'],
    ['accounts', 'users-round', 'Equipo y roles'],
  ];
  readonly sizes: { key: Serving; name: string }[] = [
    { key: 'large', name: 'Grande' },
    { key: 'small', name: 'Pequeño' },
    { key: 'shot', name: 'Shot' },
  ];
  profile: StaffAccount | null = null;
  ownPassword = { currentPassword: '', password: '', passwordConfirmation: '' };
  resetMode = false;
  resetState = '';
  resetPassword = { password: '', passwordConfirmation: '' };
  readonly resetRequests = signal<
    { _id: string; account?: { name: string; username: string }; createdAt: string }[]
  >([]);
  requestReset() {
    void this.run(async () => {
      const result = await this.api.request<{ state: string }>('/auth/reset/request', 'POST', {
        username: this.username,
      });
      this.resetState = result.state;
      this.notice.set(
        'Solicitud enviada. Un administrador debe aprobarla. Conservá este navegador abierto.',
      );
    });
  }
  checkReset() {
    void this.run(async () => {
      this.resetState = (await this.api.request<{ state: string }>('/auth/reset/status')).state;
    });
  }
  finishReset() {
    void this.run(async () => {
      await this.api.request('/auth/reset/complete', 'POST', this.resetPassword);
      this.resetPassword = { password: '', passwordConfirmation: '' };
      this.resetMode = false;
      this.resetState = '';
    }, 'Contraseña actualizada. Ya podés iniciar sesión.');
  }
  saveProfile() {
    void this.run(async () => {
      this.profile = await this.api.request<StaffAccount>('/admin/me', 'PUT', this.profile);
    }, 'Perfil actualizado.');
  }
  changeOwnPassword() {
    void this.run(async () => {
      await this.api.request('/admin/me/password', 'PUT', this.ownPassword);
      this.ownPassword = { currentPassword: '', password: '', passwordConfirmation: '' };
    }, 'Contraseña actualizada. Las demás sesiones deberán ingresar de nuevo.');
  }
  loadResets() {
    void this.run(async () => {
      this.resetRequests.set(await this.api.request('/admin/password-resets'));
    });
  }
  decideReset(id: string, state: string) {
    void this.run(async () => {
      await this.api.request('/admin/password-resets/' + id, 'PATCH', { state });
      this.resetRequests.set(await this.api.request('/admin/password-resets'));
    }, 'Solicitud atendida.');
  }
  username = '';
  password = '';
  label = '';
  from = '';
  to = '';
  product: Product | null = null;
  promotion: Promotion | null = null;
  event: CalendarEvent | null = null;
  settings: Settings | null = null;
  selectedStock: Product | null = null;
  stockQuantity = 1;
  stockMode = 'bottles';
  stockReason = '';
  selectedServing: Record<string, Serving> = {};
  voidId = '';
  voidReason = '';
  private requestId = crypto.randomUUID();
  constructor() {
    void this.init();
    this.destroyRef.onDestroy(() => this.stopWatching());
  }
  async init() {
    await this.run(async () => {
      const publicData = await this.api.request<{ settings: Settings }>('/public');
      if (publicData.settings?.name) this.businessName.set(publicData.settings.name);
      this.title.setTitle(`${publicData.settings.name} · Administración`);
      await this.api.status();
      if (this.api.authenticated()) {
        await this.api.load();
        await this.enterWorkspace();
      }
    });
    this.loading.set(false);
  }
  async run(task: () => Promise<unknown>, success = '') {
    if (this.busy() || this.imageUploading()) return;
    this.busy.set(true);
    this.error.set('');
    this.notice.set('');
    try {
      await task();
      if (success) this.notice.set(success);
    } catch (e) {
      this.error.set((e as Error).message);
    } finally {
      this.busy.set(false);
    }
  }
  async login() {
    await this.run(async () => {
      await this.api.login(this.username, this.password);
      this.password = '';
      const setup = await this.api.request<{ businessRequired: boolean }>('/setup/status');
      if (setup.businessRequired) {
        await this.router.navigateByUrl('/business/setup', { replaceUrl: true });
        return;
      }
      await this.enterWorkspace();
    });
  }
  logout() {
    void this.run(async () => {
      await this.api.logout();
      this.stopWatching();
    });
  }
  openTab(tab: string) {
    if (typeof window.matchMedia === 'function' && window.matchMedia('(max-width: 900px)').matches)
      this.sidebarExpanded.set(false);
    this.tab.set(tab);
    this.search.set('');
    this.error.set('');
    this.notice.set('');
    if (tab === 'settings') this.settings = structuredClone(this.api.state()!.settings);
    if (tab === 'tables') void this.run(() => this.loadTables());
    if (tab === 'profile')
      void this.run(async () => {
        this.profile = await this.api.request<StaffAccount>('/admin/me');
      });
    if (tab === 'accounts') void this.run(() => this.loadAccounts());
  }
  async loadReport() {
    const params = new URLSearchParams();
    if (this.from) params.set('from', new Date(this.from + 'T00:00:00').toISOString());
    if (this.to) {
      const next = new Date(this.to + 'T00:00:00');
      next.setDate(next.getDate() + 1);
      params.set('to', next.toISOString());
    }
    this.report.set(await this.api.request<Report>('/admin/reports?' + params));
  }
  refreshReport() {
    void this.run(() => this.loadReport());
  }
  editProduct(product?: Product) {
    this.product = product ? structuredClone(product) : blankProduct();
  }
  changeCategory() {
    if (this.product) this.product.inventory = this.product.category === 'drink' ? 'unit' : 'none';
  }
  saveProduct() {
    const product = this.product!;
    void this.run(async () => {
      await this.api.request(
        '/admin/products' + (product._id ? '/' + product._id : ''),
        product._id ? 'PUT' : 'POST',
        product,
      );
      this.product = null;
      await this.api.load();
    }, 'Producto guardado.');
  }
  openStock(product: Product) {
    this.selectedStock = product;
    this.stockQuantity = 1;
    this.stockMode = product.inventory === 'ml' ? 'bottles' : 'units';
    this.stockReason = '';
  }
  saveStock() {
    const product = this.selectedStock!;
    void this.run(async () => {
      const delta = this.stockQuantity * (this.stockMode === 'bottles' ? product.bottleMl : 1);
      await this.api.request('/admin/products/' + product._id + '/stock', 'POST', {
        delta,
        reason: this.stockReason,
      });
      this.selectedStock = null;
      await this.api.load();
    }, 'Movimiento registrado.');
  }
  availableShots(product: Product) {
    return Math.floor(product.stock / this.api.state()!.settings.servings.shot);
  }
  add(product: Product) {
    if (this.busy()) return;
    const serving =
      product.inventory === 'ml' ? (this.selectedServing[product._id] ?? 'shot') : 'unit';
    const price = serving === 'unit' ? product.price : product.prices[serving];
    const cart = structuredClone(this.cart());
    const existing = cart.find(
      (line) => line.product._id === product._id && line.serving === serving,
    );
    if (existing) existing.quantity++;
    else cart.push({ product, serving, price, quantity: 1 });
    this.cart.set(cart);
    this.requestId = crypto.randomUUID();
  }
  quantity(index: number, delta: number) {
    const cart = structuredClone(this.cart());
    cart[index].quantity += delta;
    this.cart.set(cart.filter((l) => l.quantity > 0));
    this.requestId = crypto.randomUUID();
  }
  checkout() {
    void this.run(async () => {
      await this.api.request('/admin/sales', 'POST', {
        requestId: this.requestId,
        paymentMethod: this.paymentMethod,
        label: this.label || 'Venta de mostrador',
        items: this.cart().map((line) => ({
          productId: line.product._id,
          serving: line.serving,
          quantity: line.quantity,
        })),
      });
      this.cart.set([]);
      this.label = '';
      this.requestId = crypto.randomUUID();
      await this.api.load();
      await this.loadReport();
    }, 'Venta registrada e inventario actualizado.');
  }
  voidSale() {
    void this.run(async () => {
      await this.api.request('/admin/sales/' + this.voidId + '/void', 'POST', {
        reason: this.voidReason,
      });
      this.voidId = '';
      this.voidReason = '';
      await this.api.load();
      await this.loadReport();
    }, 'Venta anulada y existencias devueltas.');
  }
  editPromotion(promo?: Promotion) {
    const local = (value: string) => {
      const d = new Date(value);
      return new Date(+d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    this.promotion = promo
      ? { ...structuredClone(promo), starts: local(promo.starts), ends: local(promo.ends) }
      : {
          _id: '',
          title: '',
          description: '',
          image: '',
          starts: local(new Date().toISOString()),
          ends: local(new Date(Date.now() + 7 * 86400000).toISOString()),
          active: true,
        };
  }
  editEvent(event?: CalendarEvent) {
    const local = (value: string | null) => {
      if (!value) return '';
      const date = new Date(value);
      return new Date(+date - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    this.event = event
      ? { ...structuredClone(event), starts: local(event.starts), ends: local(event.ends) }
      : {
          _id: '',
          title: '',
          kind: 'music',
          description: '',
          image: '',
          starts: '',
          ends: '',
          location: this.api.state()?.settings.address ?? '',
          admission: '',
          active: true,
          isSample: false,
        };
  }
  saveEvent() {
    const event = this.event!;
    void this.run(async () => {
      await this.api.request(
        '/admin/events' + (event._id ? '/' + event._id : ''),
        event._id ? 'PUT' : 'POST',
        {
          ...event,
          starts: event.starts ? new Date(event.starts).toISOString() : null,
          ends: event.ends ? new Date(event.ends).toISOString() : null,
        },
      );
      this.event = null;
      await this.api.load();
    }, 'Evento guardado. Los eventos activos aparecen en la agenda pública.');
  }
  savePromotion() {
    const promo = this.promotion!;
    void this.run(async () => {
      await this.api.request(
        '/admin/promotions' + (promo._id ? '/' + promo._id : ''),
        promo._id ? 'PUT' : 'POST',
        {
          ...promo,
          starts: new Date(promo.starts).toISOString(),
          ends: new Date(promo.ends).toISOString(),
        },
      );
      this.promotion = null;
      await this.api.load();
    }, 'Promoción guardada.');
  }
  saveSettings() {
    void this.run(async () => {
      await this.api.request('/admin/settings', 'PUT', this.settings);
      await this.api.load();
      this.businessName.set(this.api.state()!.settings.name);
      this.title.setTitle(`${this.businessName()} · Administración`);
    }, 'Personalización publicada en la carta.');
  }
  exportCsv() {
    const rows = [
      ['Producto', 'Categoría', 'Unidades vendidas', 'Ingresos'],
      ...this.report().ranking.map((p) => [
        p.name,
        categoryName(p._id.category),
        p.quantity,
        p.revenue,
      ]),
    ];
    const csv =
      '\ufeff' +
      rows
        .map((row) =>
          row
            .map(
              (cell) =>
                '"' +
                String(cell)
                  .replace(/^[=+@-]/, "'$&")
                  .replaceAll('"', '""') +
                '"',
            )
            .join(','),
        )
        .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ventas.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  private stopWatching() {
    this.orderSubscription?.close();
    this.orderSubscription = undefined;
    this.connected.set(false);
    clearInterval(this.refreshTimer);
    this.refreshTimer = undefined;
  }
  private async enterWorkspace() {
    this.stopWatching();
    this.tab.set('service');
    await this.loadService();
    if (this.api.role() === 'admin') await this.loadReport();
    if (this.destroyRef.destroyed || !this.api.authenticated()) return;
    this.refreshTimer = setInterval(() => {
      if (!this.connected()) void this.discoverOrders();
    }, 5000);
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
    if (version !== this.serviceVersion || this.destroyRef.destroyed) return;
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
  refreshOrders() {
    void this.run(() => this.loadService());
  }
  ordersFor(billId: string) {
    return this.service().orders.filter((order) => order.billId === billId);
  }
  canPay(billId: string) {
    const orders = this.ordersFor(billId);
    return orders.length > 0 && orders.every((order) => order.orderStatus === 'delivered');
  }
  advance(id: string, status: string) {
    void this.run(async () => {
      await this.api.request('/admin/orders/' + id, 'PATCH', { status });
      await this.loadService();
    }, 'Pedido actualizado.');
  }
  payBill(id: string) {
    void this.run(async () => {
      await this.api.request('/admin/bills/' + id + '/pay', 'POST', {
        method: this.billMethods[id] ?? 'cash',
        reference: this.billReferences[id] ?? '',
      });
      await this.loadService();
      await this.api.load();
      if (this.api.role() === 'admin') await this.loadReport();
    }, 'Pago registrado y cuenta cerrada.');
  }
  async loadTables() {
    this.tables.set(await this.api.request<DiningTable[]>('/admin/tables'));
  }
  createTable() {
    void this.run(async () => {
      await this.api.request('/admin/tables', 'POST', { name: this.tableName });
      this.tableName = '';
      await this.loadTables();
    }, 'Mesa creada. El QR está listo para descargar.');
  }
  toggleTable(table: DiningTable) {
    void this.run(async () => {
      await this.api.request('/admin/tables/' + table._id, 'PATCH', { active: !table.active });
      await this.loadTables();
    });
  }
  async loadAccounts() {
    this.accounts.set(await this.api.request<StaffAccount[]>('/admin/accounts'));
  }
  createAccount() {
    void this.run(async () => {
      await this.api.request('/admin/accounts', 'POST', this.staff);
      this.staff = { name: '', username: '', password: '', role: 'waiter' };
      await this.loadAccounts();
    }, 'Acceso creado para el equipo.');
  }
}
