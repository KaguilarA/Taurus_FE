import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Component, inject } from '@angular/core';
import { OrderActivity } from './admin/order-activity';

@Component({ template: '', providers: [OrderActivity] })
class SocketOwner {
  readonly activity = inject(OrderActivity);
}
import { Api, ServiceState, Settings } from './api';

it('discovers the first staff order without subscribing while idle and cleans up on navigation', async () => {
  vi.useFakeTimers();
  try {
    TestBed.configureTestingModule({ imports: [SocketOwner], providers: [provideRouter([])] });
    const api = TestBed.inject(Api);
    const settings = { name: 'Felos Bar', currency: 'CRC' } as Settings;
    let service: ServiceState = { bills: [], orders: [] };
    vi.spyOn(api, 'status').mockImplementation(async () => {
      api.authenticated.set(true);
      api.role.set('waiter');
    });
    vi.spyOn(api, 'load').mockImplementation(async () => {
      api.state.set({ settings, products: [], promotions: [], sales: [], movements: [] });
    });
    const request = vi.spyOn(api, 'request').mockImplementation(async (path) => {
      if (path === '/public') return { settings } as never;
      if (path === '/admin/order-activity')
        return { hasOrders: service.orders.length > 0 } as never;
      if (path === '/admin/service') return service as never;
      throw new Error('Unexpected request: ' + path);
    });
    const subscription = { close: vi.fn(), retry: vi.fn() };
    const socket = vi
      .spyOn(api, 'orderSocket')
      .mockImplementation((_scope, _refresh, connection) => {
        connection(true);
        return subscription;
      });
    await api.status();
    await api.load();
    const fixture = TestBed.createComponent(SocketOwner);
    await vi.advanceTimersByTimeAsync(0);
    expect(socket).not.toHaveBeenCalled();
    service = {
      bills: [],
      orders: [{ _id: 'first', status: 'open', orderStatus: 'pending', items: [] } as never],
    };
    await vi.advanceTimersByTimeAsync(5000);
    expect(socket).toHaveBeenCalledTimes(1);
    request.mockClear();
    await vi.advanceTimersByTimeAsync(10000);
    expect(request).not.toHaveBeenCalled();
    service = { bills: [], orders: [] };
    socket.mock.calls[0][1]();
    await vi.waitFor(() => expect(subscription.close).toHaveBeenCalledTimes(1));
    await vi.advanceTimersByTimeAsync(5000);
    expect(socket).toHaveBeenCalledTimes(1);
    fixture.destroy();
    const requests = request.mock.calls.length;
    await vi.advanceTimersByTimeAsync(10000);
    expect(request).toHaveBeenCalledTimes(requests);
  } finally {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  }
});
