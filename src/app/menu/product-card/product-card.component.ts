import { Component, computed, input, output, signal } from '@angular/core';
import { Icon } from '../../icon';
import type { MenuItem, MenuSelection, Product, Serving, Settings } from '../../interfaces';
import { Select } from '../../shared/ui/select';
import { menuCategory, menuMoney } from '../menu-format';
import { SERVING_OPTIONS } from '../menu.models';
@Component({
  host: { class: 'block min-w-0 h-full' },
  selector: 'app-product-card',
  imports: [Select, Icon],
  templateUrl: './product-card.component.html',
})
export class ProductCardComponent {
  public readonly product = input.required<MenuItem & Partial<Pick<Product, 'stock' | 'active'>>>();
  public readonly settings = input.required<Settings>();
  public readonly canOrder = input(false);
  public readonly submitting = input(false);
  public readonly canEdit = input(false);
  public readonly showDetails = input(true);
  public readonly showImage = input(false);
  public readonly showStock = input(false);
  public readonly forcePrices = input(false);
  public readonly recommended = input(false);
  public readonly editRequested = output<void>();
  public readonly detailsRequested = output<MenuSelection>();
  public readonly productAdded = output<MenuSelection>();
  public readonly serving = signal<Serving>('shot');
  public readonly servings = SERVING_OPTIONS;
  public readonly servingChoices = SERVING_OPTIONS.map((option) => ({
    value: option.key,
    label: option.label,
  }));
  public readonly category = computed(() => menuCategory(this.product()));
  public readonly price = computed(() =>
    menuMoney(
      this.product().inventory === 'ml' ? this.product().prices.shot : this.product().price,
      this.settings().currency,
    ),
  );
  public readonly showPrices = computed(
    () => this.forcePrices() || this.settings().showMenuPrices !== false,
  );
  public selection(): MenuSelection {
    return {
      product: this.product(),
      serving: this.product().inventory === 'ml' ? this.serving() : 'unit',
    };
  }
}
