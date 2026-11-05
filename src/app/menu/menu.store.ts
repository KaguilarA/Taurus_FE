import { computed, DestroyRef, inject, Injectable, signal } from '@angular/core';
import type { DrinkFilter, MenuCategory, MenuPage, MenuQuery } from '../interfaces';
import { MenuApi } from './menu-api.service';
import { DEFAULT_MENU_QUERY } from './menu.models';
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
  public readonly query = this.queryState.asReadonly();
  public readonly page = this.pageState.asReadonly();
  public readonly loading = this.loadingState.asReadonly();
  public readonly error = this.errorState.asReadonly();
  public readonly search = this.searchState.asReadonly();
  public readonly pageNumbers = computed(() => {
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
  public initialize(initialPage?: MenuPage): void {
    if (initialPage) this.pageState.set(initialPage);
    else this.load();
  }
  public setSearch(value: string): void {
    this.searchState.set(value);
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => this.changeQuery({ page: 1 }), 250);
  }
  public setCategory(category: MenuCategory): void {
    this.changeQuery({ category, drinkType: 'all', page: 1 });
  }
  public setDrinkType(drinkType: DrinkFilter): void {
    this.changeQuery({ drinkType, page: 1 });
  }
  public goToPage(page: number): void {
    if (page < 1 || page > (this.page()?.pageCount ?? 0) || this.loading()) return;
    this.changeQuery({ page });
  }
  public clear(): void {
    this.searchState.set('');
    this.changeQuery(DEFAULT_MENU_QUERY);
  }
  public retry(): void {
    this.load();
  }
  private changeQuery(patch: Partial<MenuQuery>): void {
    clearTimeout(this.searchTimer);
    const q = this.search().trim();
    const page = q === this.query().q ? (patch.page ?? 1) : 1;
    const next = { ...this.query(), ...patch, q, page };
    const current = this.query();
    if (
      this.page() &&
      !this.error() &&
      next.q === current.q &&
      next.category === current.category &&
      next.drinkType === current.drinkType &&
      next.page === current.page
    )
      return;
    this.queryState.set(next);
    this.load();
  }
  private async load(): Promise<void> {
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
