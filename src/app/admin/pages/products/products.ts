import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../../icon';
import type { Product } from '../../../interfaces';
import { ProductCardComponent } from '../../../menu/product-card';
import { CatalogFilters, CatalogState, Pagination } from '../../../shared/catalog';
import { DeferredError } from '../../../shared/deferred-error';
import { Button, Dialog, EmptyState, Feedback } from '../../../shared/ui';
import { PageSkeleton } from '../../../shared/ui/page-skeleton';
import { AdminTask } from '../../shared/admin-task';
import { AdminPageHeading } from '../../shared/page-heading';
import { ProductEditor } from './product-editor';
const blankProduct = (): Product => ({
  _id: '',
  name: '',
  description: '',
  image: '',
  category: 'food',
  drinkType: '',
  inventory: 'none',
  price: 0,
  prices: { large: 0, small: 0, shot: 0 },
  bottleMl: 1000,
  stock: 0,
  minimum: 0,
  active: true,
  featured: false,
});
@Component({
  selector: 'app-admin-products',
  imports: [
    Dialog,
    Button,
    Feedback,
    ProductCardComponent,
    CatalogFilters,
    Pagination,
    EmptyState,
    ProductEditor,
    DeferredError,
    AdminPageHeading,
    PageSkeleton,
    FormsModule,
    Icon,
  ],
  templateUrl: './products.html',
})
export class ProductsPage extends AdminTask {
  public readonly catalog = new CatalogState(computed(() => this.api.state()?.products ?? []));
  public readonly product = signal<Product | null>(null);
  public editProduct(product?: Product): void {
    this.product.set(product ? structuredClone(product) : blankProduct());
  }
  public saveProduct(): void {
    const product = this.product()!;
    if (
      this.api.state()?.productTypes?.find((type) => type.code === product.category)
        ?.requiresDrinkType &&
      !['alcoholic', 'non_alcoholic'].includes(product.drinkType ?? '')
    ) {
      this.error.set('Seleccioná la subcategoría de la bebida.');
      return;
    }
    this.run(async () => {
      await this.api.request(
        '/admin/products' + (product._id ? '/' + product._id : ''),
        product._id ? 'PUT' : 'POST',
        product,
      );
      this.product.set(null);
      await this.api.load();
    }, 'Producto guardado.');
  }
}
