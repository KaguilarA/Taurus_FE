import type { Product, Serving } from '../api';

export type MenuCategory = Product['category'] | 'all';
export type DrinkFilter = 'all' | 'alcoholic' | 'non_alcoholic';
export type MenuItem = Readonly<
  Pick<
    Product,
    | '_id'
    | 'name'
    | 'description'
    | 'image'
    | 'category'
    | 'drinkType'
    | 'inventory'
    | 'price'
    | 'prices'
    | 'featured'
  >
>;
export interface MenuQuery {
  readonly q: string;
  readonly category: MenuCategory;
  readonly drinkType: DrinkFilter;
  readonly page: number;
  readonly pageSize: number;
}
export interface MenuPage {
  readonly items: readonly MenuItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly pageCount: number;
}
export interface MenuSelection {
  readonly product: MenuItem;
  readonly serving: Serving | 'unit';
}
export const DEFAULT_MENU_QUERY: MenuQuery = {
  q: '',
  category: 'all',
  drinkType: 'all',
  page: 1,
  pageSize: 9,
};
export const MENU_CATEGORIES: readonly { value: MenuCategory; label: string }[] = [
  { value: 'all', label: 'Todo' },
  { value: 'food', label: 'Comidas' },
  { value: 'drink', label: 'Bebidas' },
  { value: 'snack', label: 'Snacks y botanas' },
];
export const DRINK_FILTERS: readonly { value: DrinkFilter; label: string }[] = [
  { value: 'all', label: 'Todas' },
  { value: 'non_alcoholic', label: 'Libre de alcohol' },
  { value: 'alcoholic', label: 'Con alcohol' },
];
export const SERVING_OPTIONS: readonly { key: Serving; label: string }[] = [
  { key: 'shot', label: 'Shot' },
  { key: 'small', label: 'Pequeño' },
  { key: 'large', label: 'Grande' },
];
export function isServing(value: string): value is Serving {
  return SERVING_OPTIONS.some((option) => option.key === value);
}
