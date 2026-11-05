import { computed, signal, Signal } from '@angular/core';
import type { DrinkFilter, MenuCategory, Product } from '../../../interfaces';
const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es');
/** Local views use the same filters/page contract as the server-backed public menu. */
export class CatalogState<
  T extends Pick<Product, 'name' | 'description' | 'category' | 'drinkType'>,
> {
  public readonly search = signal('');
  public readonly category = signal<MenuCategory>('all');
  public readonly drinkType = signal<DrinkFilter>('all');
  private readonly requestedPage = signal(1);
  public readonly pageSize = 9;
  public readonly filtered = computed(() => {
    const term = normalize(this.search().trim());
    return this.source().filter(
      (product) =>
        (this.category() === 'all' || product.category === this.category()) &&
        (this.category() !== 'drink' ||
          this.drinkType() === 'all' ||
          product.drinkType === this.drinkType()) &&
        normalize(product.name + ' ' + (product.description ?? '')).includes(term),
    );
  });
  public readonly total = computed(() => this.filtered().length);
  public readonly page = computed(() =>
    Math.max(1, Math.min(this.requestedPage(), Math.ceil(this.total() / this.pageSize))),
  );
  public readonly items = computed(() =>
    this.filtered().slice((this.page() - 1) * this.pageSize, this.page() * this.pageSize),
  );
  constructor(private readonly source: Signal<readonly T[]>) {}
  public setSearch(value: string): void {
    this.search.set(value);
    this.requestedPage.set(1);
  }
  public setCategory(value: MenuCategory): void {
    this.category.set(value);
    this.drinkType.set('all');
    this.requestedPage.set(1);
  }
  public setDrinkType(value: DrinkFilter): void {
    this.drinkType.set(value);
    this.requestedPage.set(1);
  }
  public goToPage(value: number): void {
    if (Number.isInteger(value) && value >= 1) this.requestedPage.set(value);
  }
}
