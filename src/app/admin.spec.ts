import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ProductsPage } from './admin/pages/products';
import { SalesPage } from './admin/pages/sales';
import { OrderActivity } from './admin/order-activity';
import { navigationFor } from './admin-navigation';
import { Api, Product, Settings } from './api';
import { vi } from 'vitest';

describe('Restaurant orders', () => {
  let products: ProductsPage;
  let sales: SalesPage;
  let activity: OrderActivity;
  let api: Api;
  const product = {
    _id: 'rum',
    name: 'Ron',
    inventory: 'ml',
    prices: { shot: 2000, small: 3200, large: 4500 },
  } as Product;
  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ProductsPage, SalesPage],
      providers: [provideRouter([]), OrderActivity],
    });
    api = TestBed.inject(Api);
    vi.spyOn(api, 'status').mockResolvedValue(undefined);
    api.authenticated.set(true);
    vi.spyOn(api, 'request').mockResolvedValue({ bills: [], orders: [] });
    products = TestBed.createComponent(ProductsPage).componentInstance;
    sales = TestBed.createComponent(SalesPage).componentInstance;
    activity = TestBed.inject(OrderActivity);
    // Wait for constructor's session request to finish before invoking actions.
    await new Promise((resolve) => setTimeout(resolve, 0));
    api.state.set({
      settings: { currency: 'CRC' } as Settings,
      products: [],
      promotions: [],
      sales: [],
      movements: [],
    });
    vi.mocked(api.request).mockClear();
  });
  it('requires a beverage subcategory before sending a save request', async () => {
    const request = vi.spyOn(api, 'request').mockResolvedValue({});
    products.product = { ...product, _id: 'rum', name: 'Ron', category: 'drink', drinkType: '' };
    products.saveProduct();
    expect(request).not.toHaveBeenCalled();
    expect(products.error()).toContain('subcategoría');
    products.product.drinkType = 'alcoholic';
    vi.spyOn(api, 'load').mockResolvedValue(undefined);
    products.saveProduct();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(request).toHaveBeenCalledWith(
      '/admin/products/rum',
      'PUT',
      expect.objectContaining({ drinkType: 'alcoholic' }),
    );
  });
  it('keeps different serving prices separate and merges identical servings', () => {
    sales.add(product);
    sales.add(product);
    sales.selectedServing['rum'] = 'large';
    sales.add(product);
    expect(sales.cart().length).toBe(2);
    expect(sales.cart()[0].quantity).toBe(2);
    expect(sales.total()).toBe(8500);
    sales.quantity(0, -1);
    sales.quantity(0, -1);
    expect(sales.cart().length).toBe(1);
    expect(sales.total()).toBe(4500);
  });
  it('preserves the order and retry identifier when the request fails', async () => {
    sales.add(product);
    const request = vi.spyOn(api, 'request').mockRejectedValue(new Error('Sin conexión'));
    sales.checkout();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const first = request.mock.calls[0][2] as { requestId: string };
    expect(sales.cart().length).toBe(1);
    sales.checkout();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((request.mock.calls[1][2] as { requestId: string }).requestId).toBe(first.requestId);
    expect(sales.error()).toBe('Sin conexión');
  });
  it('shows only service operations to kitchen and waiter roles', () => {
    for (const role of ['kitchen', 'waiter'] as const) {
      api.role.set(role);
      expect(
        navigationFor(api.role()).flatMap((group) => group.items.map((item) => item.id)),
      ).toEqual(['service', 'profile']);
    }
    api.role.set('admin');
    expect(
      navigationFor(api.role()).flatMap((group) => group.items.map((item) => item.id)),
    ).toContain('accounts');
    expect(
      navigationFor(api.role()).flatMap((group) => group.items.map((item) => item.id)),
    ).toContain('tables');
  });
  it('handles snacks without inventory and enables payment only after delivery', () => {
    products.editProduct();
    products.product!.category = 'snack';
    products.changeCategory();
    expect(products.product!.inventory).toBe('none');
    expect(activity.canPay('bill')).toBe(false);
    activity.service.set({
      bills: [],
      orders: [{ _id: 'order', billId: 'bill', orderStatus: 'ready' } as never],
    });
    expect(activity.canPay('bill')).toBe(false);
    activity.service.set({
      bills: [],
      orders: [{ _id: 'order', billId: 'bill', orderStatus: 'delivered' } as never],
    });
    expect(activity.canPay('bill')).toBe(true);
  });
  it('opens a socket only for active role orders and closes it when they end', async () => {
    api.authenticated.set(true);
    api.role.set('kitchen');
    const subscription = { close: vi.fn(), retry: vi.fn() };
    const socket = vi.spyOn(api, 'orderSocket').mockReturnValue(subscription);
    const request = vi.spyOn(api, 'request');
    request.mockResolvedValue({ bills: [], orders: [] });
    await activity.loadService();
    expect(socket).not.toHaveBeenCalled();
    request.mockResolvedValue({
      bills: [],
      orders: [{ _id: 'order', status: 'open', orderStatus: 'delivered' }],
    });
    await activity.loadService();
    expect(socket).not.toHaveBeenCalled();
    request.mockResolvedValue({
      bills: [],
      orders: [{ _id: 'order', status: 'open', orderStatus: 'ready' }],
    });
    await activity.loadService();
    await activity.loadService();
    expect(socket).toHaveBeenCalledTimes(1);
    expect(socket.mock.calls[0][0]).toEqual({ kind: 'staff' });
    request.mockResolvedValue({ bills: [], orders: [] });
    await activity.loadService();
    expect(subscription.close).toHaveBeenCalledTimes(1);
  });
  it('keeps a waiter subscribed for payment and closes the socket on logout', async () => {
    api.authenticated.set(true);
    api.role.set('waiter');
    const subscription = { close: vi.fn(), retry: vi.fn() };
    const socket = vi.spyOn(api, 'orderSocket').mockReturnValue(subscription);
    vi.spyOn(api, 'request').mockResolvedValue({
      bills: [],
      orders: [{ _id: 'order', status: 'open', orderStatus: 'delivered' }],
    });
    await activity.loadService();
    expect(socket).toHaveBeenCalledTimes(1);
    await api.logout();
    activity.stopWatching();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(subscription.close).toHaveBeenCalledTimes(1);
    expect(api.authenticated()).toBe(false);
  });
});
