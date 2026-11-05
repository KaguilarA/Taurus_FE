import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Api } from './api';

describe('API concurrent reads', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    TestBed.resetTestingModule();
  });
  it('shares only simultaneous reads and requests fresh data after completion', async () => {
    let resolve!: (value: Response) => void;
    const fetch = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<Response>((done) => {
            resolve = done;
          }),
      )
      .mockResolvedValue(Response.json({ value: 2 }));
    vi.stubGlobal('fetch', fetch);
    const api = TestBed.inject(Api);
    const first = api.request('/public');
    const second = api.request('/public');
    expect(fetch).toHaveBeenCalledTimes(1);
    resolve(Response.json({ value: 1 }));
    expect(await first).toEqual({ value: 1 });
    expect(await second).toEqual({ value: 1 });
    expect(await api.request('/public')).toEqual({ value: 2 });
    expect(fetch).toHaveBeenCalledTimes(2);
  });
  it('keeps abortable reads independent and never shares reads across a mutation', async () => {
    const fetch = vi.fn().mockResolvedValue(Response.json({ ok: true }));
    vi.stubGlobal('fetch', fetch);
    const api = TestBed.inject(Api);
    const first = api.request('/auth/status');
    const mutation = api.request('/auth/logout', 'POST');
    const second = api.request('/auth/status');
    await Promise.all([first, mutation, second]);
    expect(fetch).toHaveBeenCalledTimes(3);
    await Promise.all([
      api.request('/public', 'GET', undefined, { signal: new AbortController().signal }),
      api.request('/public'),
    ]);
    expect(fetch).toHaveBeenCalledTimes(5);
  });
});
