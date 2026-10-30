import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { PublicPage } from './public';
import { Api, GuestBill, Product, Settings } from './api';

describe('QR guest ordering', () => {
  let page: PublicPage;
  let api: Api;
  const snack = {
    _id: 'snack',
    name: 'Papas',
    category: 'snack',
    inventory: 'none',
    price: 1500,
  } as Product;
  const rum = {
    _id: 'rum',
    name: 'Ron',
    category: 'drink',
    inventory: 'ml',
    prices: { shot: 2000, small: 3200, large: 4500 },
  } as Product;
  const settings = {
    name: 'El Encuentro',
    description: 'Carta',
    currency: 'CRC',
    servings: { shot: 30, small: 60, large: 90 },
  } as Settings;
  beforeEach(async () => {
    TestBed.configureTestingModule({ imports: [PublicPage], providers: [provideRouter([])] });
    api = TestBed.inject(Api);
    vi.spyOn(api, 'request').mockResolvedValue({
      settings,
      products: [snack, rum],
      promotions: [],
    });
    page = TestBed.createComponent(PublicPage).componentInstance;
    await new Promise((resolve) => setTimeout(resolve, 0));
    page.bill.set({
      token: 'private-visit',
      label: 'Mesa 4',
      status: 'open',
      total: 0,
      balance: 0,
      orders: [],
    });
  });
  it('filters snacks and keeps selected drink measures separate', () => {
    page.filter.set('snack');
    expect(page.products().map((product) => product._id)).toEqual(['snack']);
    page.add(snack);
    page.add(snack);
    page.add(rum);
    page.selectedServing['rum'] = 'large';
    page.add(rum);
    expect(page.cart().length).toBe(3);
    expect(page.total()).toBe(9500);
    page.quantity(0, -1);
    expect(page.total()).toBe(8000);
  });
  it('filters alcoholic and alcohol-free beverages without guessing legacy subtypes', () => {
    page.data.set({
      settings,
      products: [
        { ...rum, drinkType: 'alcoholic' },
        { ...rum, _id: 'soda', drinkType: 'non_alcoholic' },
        { ...rum, _id: 'legacy' },
      ],
      promotions: [],
    });
    page.filter.set('drink');
    page.drinkFilter.set('alcoholic');
    expect(page.products().map((p) => p._id)).toEqual(['rum']);
    page.drinkFilter.set('non_alcoholic');
    expect(page.products().map((p) => p._id)).toEqual(['soda']);
    page.drinkFilter.set('all');
    expect(page.products()).toHaveLength(3);
  });
  it('preserves the cart and identifier after an uncertain network result', async () => {
    page.add(snack);
    const call = vi.mocked(api.request);
    call.mockClear();
    call.mockRejectedValue(new Error('Sin conexión'));
    await page.sendOrder();
    await page.sendOrder();
    expect(page.cart()[0].quantity).toBe(1);
    expect(page.error()).toBe('Sin conexión');
    expect((call.mock.calls[0][2] as { requestId: string }).requestId).toBe(
      (call.mock.calls[1][2] as { requestId: string }).requestId,
    );
    expect(call.mock.calls[0][0]).toBe('/public/bills/private-visit/orders');
  });
  it('updates the bill after sending and blocks duplicate clicks while submitting', async () => {
    page.add(snack);
    const bill: GuestBill = { ...page.bill()!, total: 1500, balance: 1500 };
    let complete!: (value: unknown) => void;
    const call = vi.mocked(api.request);
    call.mockClear();
    call.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    );
    call.mockResolvedValueOnce(bill);
    const pending = page.sendOrder();
    await page.sendOrder();
    expect(call.mock.calls.length).toBe(1);
    complete({});
    await pending;
    expect(page.cart()).toEqual([]);
    expect(page.bill()?.balance).toBe(1500);
    expect(page.busy()).toBe(false);
  });
  it('does not add items to a paid visit', () => {
    page.bill.update((bill) => ({ ...bill!, status: 'paid' }));
    page.add(snack);
    expect(page.cart()).toEqual([]);
  });
  it('subscribes only with orders, reuses the socket and closes it after payment', async () => {
    const subscription = { close: vi.fn(), retry: vi.fn() };
    const socket = vi.spyOn(api, 'orderSocket').mockReturnValue(subscription);
    const call = vi.mocked(api.request);
    call.mockResolvedValue({ ...page.bill()!, orders: [] });
    await page.refreshBill();
    expect(socket).not.toHaveBeenCalled();
    const active: GuestBill = {
      ...page.bill()!,
      orders: [{ _id: 'order', status: 'open', orderStatus: 'pending', items: [] } as never],
    };
    call.mockResolvedValue(active);
    await page.refreshBill();
    await page.refreshBill();
    expect(socket).toHaveBeenCalledTimes(1);
    expect(socket.mock.calls[0][0]).toEqual({ kind: 'bill', token: 'private-visit' });
    expect(subscription.retry).toHaveBeenCalled();
    call.mockResolvedValue({ ...active, status: 'paid', balance: 0 });
    await page.refreshBill();
    expect(subscription.close).toHaveBeenCalledTimes(1);
    expect(page.connected()).toBe(false);
  });
  it('closes its subscription when the client leaves the page', async () => {
    const subscription = { close: vi.fn(), retry: vi.fn() };
    vi.spyOn(api, 'orderSocket').mockReturnValue(subscription);
    vi.mocked(api.request).mockResolvedValue({
      ...page.bill()!,
      orders: [{ _id: 'order', status: 'open', items: [] }],
    });
    await page.refreshBill();
    TestBed.resetTestingModule();
    expect(subscription.close).toHaveBeenCalledTimes(1);
  });
  it('discovers a first order without a socket, then stops idle HTTP checks while connected', async () => {
    vi.useFakeTimers();
    try {
      let bill = { ...page.bill()!, orders: [] } as GuestBill;
      const subscription = { close: vi.fn(), retry: vi.fn() };
      const socket = vi.spyOn(api, 'orderSocket').mockReturnValue(subscription);
      const call = vi.mocked(api.request);
      call.mockImplementation(async (path) =>
        path.endsWith('/activity')
          ? ({ hasOrders: bill.orders.length > 0, closed: false } as never)
          : (bill as never),
      );
      await page.refreshBill();
      expect(socket).not.toHaveBeenCalled();
      bill = { ...bill, orders: [{ _id: 'order', status: 'open', items: [] } as never] };
      await vi.advanceTimersByTimeAsync(5000);
      expect(socket).toHaveBeenCalledTimes(1);
      expect(call.mock.calls.some(([path]) => path.endsWith('/activity'))).toBe(true);
      socket.mock.calls[0][2](true);
      call.mockClear();
      await vi.advanceTimersByTimeAsync(10000);
      expect(call).not.toHaveBeenCalled();
      TestBed.resetTestingModule();
      expect(subscription.close).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
