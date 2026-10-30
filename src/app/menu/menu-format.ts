import { categoryName } from '../api';
import type { MenuItem } from './menu.models';
const formatters = new Map<string, Intl.NumberFormat>();
export function menuMoney(value: number, currency: string): string {
  let formatter = formatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat('es-CR', {
      style: 'currency',
      currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
    formatters.set(currency, formatter);
  }
  return formatter.format(value);
}
export function menuCategory(product: MenuItem): string {
  if (product.category !== 'drink' || !product.drinkType) return categoryName(product.category);
  return product.drinkType === 'alcoholic' ? 'Bebida · Con alcohol' : 'Bebida · Libre de alcohol';
}
