import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { MenuApi } from './menu-api.service';
import { MenuStore } from './menu.store';
import type { MenuItem, MenuPage } from './menu.models';
const product = {
  _id: 'product',
  name: 'Pilsen',
  category: 'drink',
  inventory: 'unit',
  price: 1500,
  prices: {},
  image: '',
  description: 'Cerveza',
  featured: false,
} as MenuItem;
const page = (number = 1): MenuPage => ({
  items: [product],
  page: number,
  pageSize: 9,
  pageCount: 3,
  total: 20,
});
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
describe('MenuStore', () => {
  let store: MenuStore;
  const api = { list: vi.fn(), product: vi.fn() };
  beforeEach(() => {
    vi.resetAllMocks();
    TestBed.configureTestingModule({ providers: [MenuStore, { provide: MenuApi, useValue: api }] });
    store = TestBed.inject(MenuStore);
    api.list.mockResolvedValue(page());
  });
  afterEach(() => {
    TestBed.resetTestingModule();
    vi.useRealTimers();
  });
  it('uses the server initial page without downloading the catalog again', () => {
    store.initialize(page());
    expect(store.page()?.items).toEqual([product]);
    expect(api.list).not.toHaveBeenCalled();
  });
  it('debounces search and sends filters and pagination to the backend', async () => {
    vi.useFakeTimers();
    store.initialize(page());
    store.setSearch('pil');
    store.setSearch('pilsen');
    await vi.advanceTimersByTimeAsync(249);
    expect(api.list).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(api.list).toHaveBeenCalledTimes(1);
    expect(api.list.mock.calls[0][0]).toMatchObject({ q: 'pilsen', page: 1 });
    store.setCategory('drink');
    store.setDrinkType('alcoholic');
    await vi.advanceTimersByTimeAsync(0);
    expect(api.list.mock.lastCall?.[0]).toMatchObject({
      q: 'pilsen',
      category: 'drink',
      drinkType: 'alcoholic',
      page: 1,
    });
  });
  it('cancels obsolete requests and never replaces a newer response with an older one', async () => {
    let first!: (value: MenuPage) => void, second!: (value: MenuPage) => void;
    api.list
      .mockImplementationOnce(() => new Promise((resolve) => (first = resolve)))
      .mockImplementationOnce(() => new Promise((resolve) => (second = resolve)));
    store.setCategory('drink');
    store.setCategory('food');
    expect(api.list.mock.calls[0][1].aborted).toBe(true);
    second({ ...page(), items: [{ ...product, name: 'Hamburguesa' }] });
    await flush();
    first(page());
    await flush();
    expect(store.page()?.items[0].name).toBe('Hamburguesa');
    expect(store.query().category).toBe('food');
  });
  it('requests the selected page and resets to page one when filters change', async () => {
    store.initialize(page());
    api.list.mockResolvedValueOnce(page(2));
    store.goToPage(2);
    await flush();
    expect(api.list.mock.lastCall?.[0].page).toBe(2);
    store.setCategory('snack');
    await flush();
    expect(api.list.mock.lastCall?.[0]).toMatchObject({ page: 1, category: 'snack' });
  });
  it('keeps an actionable error and can retry the same query', async () => {
    api.list.mockRejectedValueOnce(new Error('Sin conexión'));
    store.initialize();
    await flush();
    expect(store.error()).toBe('Sin conexión');
    store.retry();
    await flush();
    expect(store.error()).toBe('');
    expect(store.page()?.total).toBe(20);
  });
});
