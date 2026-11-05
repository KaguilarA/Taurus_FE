import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../../icon';
import type { CartLine, PaymentMethod, Product, Serving } from '../../../interfaces';
import { ProductCardComponent } from '../../../menu/product-card';
import { SERVING_OPTIONS } from '../../../shared/business';
import { CatalogFilters, CatalogState, Pagination } from '../../../shared/catalog';
import { Button, Feedback } from '../../../shared/ui';
import { PageSkeleton } from '../../../shared/ui/page-skeleton';
import { AdminTask } from '../../shared/admin-task';
import { AdminPageHeading } from '../../shared/page-heading';
@Component({
  selector: 'app-admin-sales',
  imports: [
    ProductCardComponent,
    CatalogFilters,
    Pagination,
    Button,
    Feedback,
    AdminPageHeading,
    PageSkeleton,
    FormsModule,
    Icon,
  ],
  templateUrl: './sales.html',
})
export class SalesPage extends AdminTask {
  public readonly paymentMethod = signal<PaymentMethod>('cash');
  public readonly cart = signal<CartLine[]>([]);
  public readonly total = computed(() =>
    this.cart().reduce((sum, line) => sum + line.price * line.quantity, 0),
  );
  public readonly catalog = new CatalogState(
    computed(() => this.api.state()?.products.filter((product) => product.active) ?? []),
  );
  public readonly sizes = SERVING_OPTIONS;
  public readonly label = signal('');
  public readonly selectedServing = signal<Record<string, Serving>>({});
  private requestId = crypto.randomUUID();
  public add(product: Product, selectedServing?: Serving | 'unit'): void {
    if (this.busy()) return;
    const serving =
      product.inventory === 'ml'
        ? selectedServing && selectedServing !== 'unit'
          ? selectedServing
          : (this.selectedServing()[product._id] ?? 'shot')
        : 'unit';
    const price = serving === 'unit' ? product.price : product.prices[serving];
    const cart = structuredClone(this.cart());
    const existing = cart.find(
      (line) => line.product._id === product._id && line.serving === serving,
    );
    if (existing) existing.quantity++;
    else cart.push({ product, serving, price, quantity: 1 });
    this.cart.set(cart);
    this.requestId = crypto.randomUUID();
  }
  public quantity(index: number, delta: number): void {
    const cart = structuredClone(this.cart());
    cart[index].quantity += delta;
    this.cart.set(cart.filter((l) => l.quantity > 0));
    this.requestId = crypto.randomUUID();
  }
  public checkout(): void {
    this.run(async () => {
      await this.api.request('/admin/sales', 'POST', {
        requestId: this.requestId,
        paymentMethod: this.paymentMethod(),
        label: this.label() || 'Venta de mostrador',
        items: this.cart().map((line) => ({
          productId: line.product._id,
          serving: line.serving,
          quantity: line.quantity,
        })),
      });
      this.cart.set([]);
      this.label.set('');
      this.requestId = crypto.randomUUID();
      await this.api.load();
    }, 'Venta registrada e inventario actualizado.');
  }
}
