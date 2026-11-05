import { signal } from '@angular/core';
import type { Product } from '../../../interfaces';

import { CatalogState } from './index';

describe('CatalogState', () => {
  const product = (
    name: string,
    category: Product['category'] = 'food',
    drinkType: Product['drinkType'] = '',
  ) => ({ name, description: 'De la casa', category, drinkType }) as Product;

  it('uses accent-insensitive name/description search and resets pagination when filters change', () => {
    const source = signal(Array.from({ length: 20 }, (_, i) => product(`Plátano ${i}`)));
    const catalog = new CatalogState(source);
    catalog.goToPage(3);
    expect(catalog.items()).toHaveLength(2);
    catalog.setSearch('platano');
    expect(catalog.page()).toBe(1);
    expect(catalog.total()).toBe(20);
    catalog.setSearch('CASA');
    expect(catalog.total()).toBe(20);
    source.set([product('Sopa')]);
    expect(catalog.page()).toBe(1);
    expect(catalog.items()).toHaveLength(1);
  });

  it('resets drink subfilters when changing category and never returns a stale page', () => {
    const source = signal([
      product('Agua', 'drink', 'non_alcoholic'),
      product('Cerveza', 'drink', 'alcoholic'),
      product('Papas', 'snack'),
    ]);
    const catalog = new CatalogState(source);
    catalog.setCategory('drink');
    catalog.setDrinkType('alcoholic');
    expect(catalog.items().map((p) => p.name)).toEqual(['Cerveza']);
    catalog.setCategory('snack');
    expect(catalog.drinkType()).toBe('all');
    expect(catalog.items().map((p) => p.name)).toEqual(['Papas']);
    source.set([]);
    expect(catalog.page()).toBe(1);
    expect(catalog.items()).toEqual([]);
  });
});
