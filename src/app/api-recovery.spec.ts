import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Api } from './api';

describe('API recovery during backend startup', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });

  it('recovers from a plain-text 429 and shares concurrent reads during backoff', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('Too Many Requests', { status: 429 }))
      .mockResolvedValueOnce(Response.json({ ready: true }));
    vi.stubGlobal('fetch', fetch);
    const api = TestBed.inject(Api);
    const first = api.request('/setup/status');
    const second = api.request('/setup/status');
    await vi.advanceTimersByTimeAsync(15000);
    expect(await first).toEqual({ ready: true });
    expect(await second).toEqual({ ready: true });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(api.connecting()).toBe(false);
  });

  it('bounds stalled reads and displays connection progress until recovery', async () => {
    const fetch = vi
      .fn()
      .mockImplementationOnce(
        (_url, options) =>
          new Promise((_resolve, reject) => {
            options.signal.addEventListener('abort', () => reject(options.signal.reason));
          }),
      )
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetch);
    const api = TestBed.inject(Api);
    const result = api.request('/public');
    await vi.advanceTimersByTimeAsync(5000);
    expect(api.connecting()).toBe(true);
    await vi.advanceTimersByTimeAsync(35000);
    expect(await result).toEqual({ ok: true });
    expect(api.connecting()).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('never retries mutations or authorization failures', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValueOnce(new Response('Unavailable', { status: 503 }))
      .mockResolvedValueOnce(Response.json({ error: 'Unauthorized' }, { status: 401 }));
    vi.stubGlobal('fetch', fetch);
    const api = TestBed.inject(Api);
    await expect(api.request('/orders', 'POST', { quantity: 1 })).rejects.toThrow(
      'temporalmente ocupado',
    );
    api.authenticated.set(true);
    await expect(api.request('/admin/state')).rejects.toThrow('Unauthorized');
    expect(api.authenticated()).toBe(false);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('cancels backoff immediately when a search is superseded', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response('Unavailable', { status: 503 }));
    vi.stubGlobal('fetch', fetch);
    const controller = new AbortController();
    const result = TestBed.inject(Api).request('/menu', 'GET', undefined, {
      signal: controller.signal,
    });
    const rejected = expect(result).rejects.toThrow();
    await vi.advanceTimersByTimeAsync(1);
    controller.abort();
    await rejected;
    await vi.advanceTimersByTimeAsync(10000);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('stops after three failures and allows a fresh attempt', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response('Unavailable', { status: 503 })));
    vi.stubGlobal('fetch', fetch);
    const api = TestBed.inject(Api);
    const rejected = expect(api.request('/public')).rejects.toThrow('temporalmente ocupado');
    await vi.advanceTimersByTimeAsync(45000);
    await rejected;
    expect(fetch).toHaveBeenCalledTimes(3);
    expect(api.connecting()).toBe(false);
    fetch.mockResolvedValueOnce(Response.json({ ok: true }));
    expect(await api.request('/public')).toEqual({ ok: true });
  });

  it('respects long rate limits without repeated requests', async () => {
    const fetch = vi
      .fn()
      .mockResolvedValue(
        new Response('Rate limited', { status: 429, headers: { 'Retry-After': '60' } }),
      );
    vi.stubGlobal('fetch', fetch);
    await expect(TestBed.inject(Api).request('/public')).rejects.toThrow('temporalmente ocupado');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('keeps the timeout active when headers arrive but the JSON body stalls', async () => {
    const fetch = vi
      .fn()
      .mockImplementationOnce((_url, options) =>
        Promise.resolve(
          new Response(
            new ReadableStream({
              start(stream) {
                stream.enqueue(new TextEncoder().encode('{"partial":'));
                options.signal.addEventListener('abort', () => stream.error(options.signal.reason));
              },
            }),
            { headers: { 'Content-Type': 'application/json' } },
          ),
        ),
      )
      .mockResolvedValueOnce(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetch);
    const api = TestBed.inject(Api);
    const result = api.request('/public');
    await vi.advanceTimersByTimeAsync(40000);
    expect(await result).toEqual({ ok: true });
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(api.connecting()).toBe(false);
  });

  it('supports cancellable reads without AbortSignal.any', async () => {
    const any = vi.spyOn(AbortSignal, 'any').mockImplementation(() => {
      throw new Error('Unsupported browser API');
    });
    const fetch = vi.fn().mockImplementation(
      (_url, options) =>
        new Promise((_resolve, reject) => {
          options.signal.addEventListener('abort', () => reject(options.signal.reason));
        }),
    );
    vi.stubGlobal('fetch', fetch);
    const controller = new AbortController();
    const result = TestBed.inject(Api).request('/public/menu', 'GET', undefined, {
      signal: controller.signal,
    });
    const rejected = expect(result).rejects.toThrow();
    controller.abort();
    await rejected;
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(any).not.toHaveBeenCalled();
  });

  it('rejects successful HTML responses instead of accepting an empty business configuration', async () => {
    const fetch = vi
      .fn()
      .mockImplementation(() => Promise.resolve(new Response('<html>Provider loading</html>')));
    vi.stubGlobal('fetch', fetch);
    const rejected = expect(TestBed.inject(Api).request('/setup/status')).rejects.toThrow(
      'conexión',
    );
    await vi.advanceTimersByTimeAsync(45000);
    await rejected;
    expect(fetch).toHaveBeenCalledTimes(3);
  });
});
