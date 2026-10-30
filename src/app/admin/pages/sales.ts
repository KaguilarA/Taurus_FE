import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Product, Serving, PaymentMethod } from '../../api';
import { Icon } from '../../icon';

import { PageSkeleton } from '../../page-skeleton';
import { AdminPageHeading } from '../shared/page-heading';
import { AdminTask } from '../shared/admin-task';

interface CartLine {
  product: Product;
  serving: Serving | 'unit';
  quantity: number;
  price: number;
}
@Component({
  selector: 'app-admin-sales',
  imports: [AdminPageHeading, PageSkeleton, FormsModule, Icon],
  templateUrl: './sales.html',
})
export class SalesPage extends AdminTask {
  paymentMethod: PaymentMethod = 'cash';
  readonly search = signal('');
  readonly cart = signal<CartLine[]>([]);
  readonly total = computed(() =>
    this.cart().reduce((sum, line) => sum + line.price * line.quantity, 0),
  );
  readonly filtered = computed(
    () =>
      this.api
        .state()
        ?.products.filter((p) => p.name.toLowerCase().includes(this.search().toLowerCase())) ?? [],
  );
  readonly sizes: { key: Serving; name: string }[] = [
    { key: 'large', name: 'Grande' },
    { key: 'small', name: 'Pequeño' },
    { key: 'shot', name: 'Shot' },
  ];
  label = '';
  selectedServing: Record<string, Serving> = {};
  private requestId = crypto.randomUUID();
  add(product: Product) {
    if (this.busy()) return;
    const serving =
      product.inventory === 'ml' ? (this.selectedServing[product._id] ?? 'shot') : 'unit';
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
  quantity(index: number, delta: number) {
    const cart = structuredClone(this.cart());
    cart[index].quantity += delta;
    this.cart.set(cart.filter((l) => l.quantity > 0));
    this.requestId = crypto.randomUUID();
  }
  checkout() {
    void this.run(async () => {
      await this.api.request('/admin/sales', 'POST', {
        requestId: this.requestId,
        paymentMethod: this.paymentMethod,
        label: this.label || 'Venta de mostrador',
        items: this.cart().map((line) => ({
          productId: line.product._id,
          serving: line.serving,
          quantity: line.quantity,
        })),
      });
      this.cart.set([]);
      this.label = '';
      this.requestId = crypto.randomUUID();
      await this.api.load();
    }, 'Venta registrada e inventario actualizado.');
  }
}
