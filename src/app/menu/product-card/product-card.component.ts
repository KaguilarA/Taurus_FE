import { Component, computed, input, output, signal } from '@angular/core';
import type { Serving, Settings } from '../../api';
import { Icon } from '../../icon';
import { menuCategory, menuMoney } from '../menu-format';
import { isServing, SERVING_OPTIONS, type MenuItem, type MenuSelection } from '../menu.models';
@Component({
  selector: 'app-product-card',
  imports: [Icon],
  templateUrl: './product-card.component.html',
  styleUrl: './product-card.component.css',
})
export class ProductCardComponent {
  readonly product = input.required<MenuItem>();
  readonly settings = input.required<Settings>();
  readonly canOrder = input(false);
  readonly submitting = input(false);
  readonly detailsRequested = output<MenuSelection>();
  readonly productAdded = output<MenuSelection>();
  readonly serving = signal<Serving>('shot');
  readonly servings = SERVING_OPTIONS;
  readonly category = computed(() => menuCategory(this.product()));
  readonly price = computed(() =>
    menuMoney(
      this.product().inventory === 'ml' ? this.product().prices.shot : this.product().price,
      this.settings().currency,
    ),
  );
  readonly showPrices = computed(() => this.settings().showMenuPrices !== false);
  chooseServing(event: Event) {
    if (event.target instanceof HTMLSelectElement && isServing(event.target.value))
      this.serving.set(event.target.value);
  }
  selection(): MenuSelection {
    return {
      product: this.product(),
      serving: this.product().inventory === 'ml' ? this.serving() : 'unit',
    };
  }
}
