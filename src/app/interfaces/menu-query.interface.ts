import type { DrinkFilter, MenuCategory } from './index';

export interface MenuQuery {
  readonly q: string;
  readonly category: MenuCategory;
  readonly drinkType: DrinkFilter;
  readonly page: number;
  readonly pageSize: number;
}
