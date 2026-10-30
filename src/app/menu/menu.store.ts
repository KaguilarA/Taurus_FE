import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import { MenuApi } from './menu-api.service';
import {
  DEFAULT_MENU_QUERY,
  type DrinkFilter,
  type MenuCategory,
  type MenuPage,
  type MenuQuery,
} from './menu.models';
@Injectable()
export class MenuStore {
  private readonly api = inject(MenuApi);
  private readonly destroyRef = inject(DestroyRef);
  private activeRequest?: AbortController;
  private requestVersion = 0;
  private searchTimer?: ReturnType<typeof setTimeout>;
  private readonly queryState = signal<MenuQuery>(DEFAULT_MENU_QUERY);
  private readonly pageState = signal<MenuPage | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal('');
  private readonly searchState = signal('');
  readonly query = this.queryState.asReadonly();
  readonly page = this.pageState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly search = this.searchState.asReadonly();
  readonly pageNumbers = computed(() => {
    const result = this.page();
    if (!result) return [];
    const start = Math.max(1, Math.min(result.page - 2, result.pageCount - 4));
    return Array.from({ length: Math.min(5, result.pageCount) }, (_, index) => start + index);
  });
  constructor() {
    this.destroyRef.onDestroy(() => {
      clearTimeout(this.searchTimer);
      this.activeRequest?.abort();
    });
  }
  initialize(initialPage?: MenuPage) {
    if (initialPage) this.pageState.set(initialPage);
    else void this.load();
  }
  setSearch(value: string) {
    this.searchState.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.changeQuery({ page: 1 }), 250);
  }
  setCategory(category: MenuCategory) {
    this.changeQuery({ category, drinkType: 'all', page: 1 });
  }
  setDrinkType(drinkType: DrinkFilter) {
    this.changeQuery({ drinkType, page: 1 });
  }
  goToPage(page: number) {
    if (page < 1 || page > (this.page()?.pageCount ?? 0) || this.loading()) return;
    this.changeQuery({ page });
  }
  clear() {
    this.searchState.set('');
    this.changeQuery(DEFAULT_MENU_QUERY);
  }
  retry() {
    void this.load();
  }
  private changeQuery(patch: Partial<MenuQuery>) {
    clearTimeout(this.searchTimer);
    const q = this.search().trim();
    const page = q === this.query().q ? (patch.page ?? 1) : 1;
    this.queryState.update((current) => ({ ...current, ...patch, q, page }));
    void this.load();
  }
  private async load() {
    this.activeRequest?.abort();
    const request = new AbortController();
    this.activeRequest = request;
    const version = ++this.requestVersion;
    this.loadingState.set(true);
    this.errorState.set('');
    try {
      const page = await this.api.list(this.query(), request.signal);
      if (this.destroyRef.destroyed || version !== this.requestVersion) return;
      this.pageState.set(page);
      this.queryState.update((query) => ({ ...query, page: page.page }));
    } catch (error) {
      if (!request.signal.aborted && version === this.requestVersion)
        this.errorState.set(error instanceof Error ? error.message : 'No pudimos cargar la carta.');
    } finally {
      if (!this.destroyRef.destroyed && version === this.requestVersion)
        this.loadingState.set(false);
    }
  }
}
