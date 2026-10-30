import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Product, Serving, categoryName } from '../../api';
import { Icon } from '../../icon';
import { ImageUpload } from '../../image-upload';
import { PageSkeleton } from '../../page-skeleton';
import { AdminPageHeading } from '../shared/page-heading';
import { AdminTask } from '../shared/admin-task';

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
  imports: [AdminPageHeading, PageSkeleton, FormsModule, Icon, ImageUpload],
  templateUrl: './products.html',
})
export class ProductsPage extends AdminTask {
  readonly categoryName = categoryName;
  readonly search = signal('');
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
  product: Product | null = null;
  editProduct(product?: Product) {
    this.product = product ? structuredClone(product) : blankProduct();
  }
  changeCategory() {
    if (this.product) this.product.inventory = this.product.category === 'drink' ? 'unit' : 'none';
  }
  saveProduct() {
    const product = this.product!;
    if (
      product.category === 'drink' &&
      !['alcoholic', 'non_alcoholic'].includes(product.drinkType ?? '')
    ) {
      this.error.set('Seleccioná la subcategoría de la bebida.');
      return;
    }
    void this.run(async () => {
      await this.api.request(
        '/admin/products' + (product._id ? '/' + product._id : ''),
        product._id ? 'PUT' : 'POST',
        product,
      );
      this.product = null;
      await this.api.load();
    }, 'Producto guardado.');
  }
}
