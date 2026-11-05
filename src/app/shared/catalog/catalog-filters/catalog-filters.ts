import { Component, computed, inject, input, output } from '@angular/core';
import { Api } from '../../../api';
import { Icon } from '../../../icon';
import type { DrinkFilter, MenuCategory } from '../../../interfaces';
import { DRINK_FILTERS, MENU_CATEGORIES } from '../../../menu/menu.models';
import { ChoiceList } from '../../ui';
@Component({
  selector: 'app-catalog-filters',
  imports: [Icon, ChoiceList],
  host: { class: 'mb-6 grid gap-4' },
  templateUrl: './catalog-filters.html',
})
export class CatalogFilters {
  private readonly api = inject(Api);
  public readonly search = input('');
  public readonly category = input<MenuCategory>('all');
  public readonly drinkType = input<DrinkFilter>('all');
  public readonly showSearch = input(true);
  public readonly showCategories = input(true);
  public readonly showDrinkTypes = input(true);
  public readonly searchLabel = input('Buscar productos');
  public readonly searchChanged = output<string>();
  public readonly categoryChanged = output<MenuCategory>();
  public readonly drinkTypeChanged = output<DrinkFilter>();
  public readonly types = computed(
    () => this.api.state()?.productTypes ?? this.api.productTypes?.() ?? [],
  );
  public readonly categories = computed(() =>
    this.types().length
      ? [
          { value: 'all', label: 'Todo' },
          ...this.types()
            .filter((type) => type.active !== false)
            .map((type) => ({ value: type.code, label: type.name })),
        ]
      : MENU_CATEGORIES,
  );
  public readonly needsDrinkType = computed(
    () =>
      this.types().find((type) => type.code === this.category())?.requiresDrinkType ??
      this.category() === 'drink',
  );
  public readonly drinkFilters = DRINK_FILTERS;
  public searchInput(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.searchChanged.emit(event.target.value);
  }
}
