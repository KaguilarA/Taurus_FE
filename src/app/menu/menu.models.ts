import type { DrinkFilter, MenuCategory, MenuQuery, Serving } from '../interfaces';

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
