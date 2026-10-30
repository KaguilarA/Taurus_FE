import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AdminPage } from './admin';
import { Api, Product, Settings } from './api';
import { vi } from 'vitest';

describe('Restaurant orders', () => {
  let page: AdminPage;
  let api: Api;
  const product = {
    _id: 'rum',
    name: 'Ron',
    inventory: 'ml',
    prices: { shot: 2000, small: 3200, large: 4500 },
  } as Product;
  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [AdminPage], providers: [provideRouter([])] });
    api = TestBed.inject(Api);
    vi.spyOn(api, 'status').mockResolvedValue(undefined);
    page = TestBed.createComponent(AdminPage).componentInstance;
    // Wait for constructor's session request to finish before invoking actions.
    await new Promise((resolve) => setTimeout(resolve, 0));
    api.state.set({
      settings: { currency: 'CRC' } as Settings,
      products: [],
      promotions: [],
      sales: [],
      movements: [],
    });
  });
  it('keeps different serving prices separate and merges identical servings', () => {
    page.add(product);
    page.add(product);
    page.selectedServing['rum'] = 'large';
    page.add(product);
    expect(page.cart().length).toBe(2);
    expect(page.cart()[0].quantity).toBe(2);
    expect(page.total()).toBe(8500);
    page.quantity(0, -1);
    page.quantity(0, -1);
    expect(page.cart().length).toBe(1);
    expect(page.total()).toBe(4500);
  });
  it('preserves the order and retry identifier when the request fails', async () => {
    page.add(product);
    const request = vi.spyOn(api, 'request').mockRejectedValue(new Error('Sin conexión'));
    page.checkout();
    await new Promise((resolve) => setTimeout(resolve, 0));
    const first = request.mock.calls[0][2] as { requestId: string };
    expect(page.cart().length).toBe(1);
    page.checkout();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect((request.mock.calls[1][2] as { requestId: string }).requestId).toBe(first.requestId);
    expect(page.error()).toBe('Sin conexión');
  });
  it('shows only service operations to kitchen and waiter roles', () => {
    for (const role of ['kitchen', 'waiter'] as const) {
      api.role.set(role);
      expect(page.nav().map((item) => item[0])).toEqual(['service', 'profile']);
    }
    api.role.set('admin');
    expect(page.nav().map((item) => item[0])).toContain('accounts');
    expect(page.nav().map((item) => item[0])).toContain('tables');
  });
  it('handles snacks without inventory and enables payment only after delivery', () => {
    page.editProduct();
    page.product!.category = 'snack';
    page.changeCategory();
    expect(page.product!.inventory).toBe('none');
    expect(page.canPay('bill')).toBe(false);
    page.service.set({
      bills: [],
      orders: [{ _id: 'order', billId: 'bill', orderStatus: 'ready' } as never],
    });
    expect(page.canPay('bill')).toBe(false);
    page.service.set({
      bills: [],
      orders: [{ _id: 'order', billId: 'bill', orderStatus: 'delivered' } as never],
    });
    expect(page.canPay('bill')).toBe(true);
  });
  it('opens a socket only for active role orders and closes it when they end', async () => {
    api.authenticated.set(true);
    api.role.set('kitchen');
    const subscription = { close: vi.fn(), retry: vi.fn() };
    const socket = vi.spyOn(api, 'orderSocket').mockReturnValue(subscription);
    const request = vi.spyOn(api, 'request');
    request.mockResolvedValue({ bills: [], orders: [] });
    await page.loadService();
    expect(socket).not.toHaveBeenCalled();
    request.mockResolvedValue({
      bills: [],
      orders: [{ _id: 'order', status: 'open', orderStatus: 'delivered' }],
    });
    await page.loadService();
    expect(socket).not.toHaveBeenCalled();
    request.mockResolvedValue({
      bills: [],
      orders: [{ _id: 'order', status: 'open', orderStatus: 'ready' }],
    });
    await page.loadService();
    await page.loadService();
    expect(socket).toHaveBeenCalledTimes(1);
    expect(socket.mock.calls[0][0]).toEqual({ kind: 'staff' });
    request.mockResolvedValue({ bills: [], orders: [] });
    await page.loadService();
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
    await page.loadService();
    expect(socket).toHaveBeenCalledTimes(1);
    page.logout();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(subscription.close).toHaveBeenCalledTimes(1);
    expect(api.authenticated()).toBe(false);
  });
});
