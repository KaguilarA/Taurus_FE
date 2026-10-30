import { Component, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { Product } from '../../api';
import { Icon } from '../../icon';

import { PageSkeleton } from '../../page-skeleton';
import { AdminPageHeading } from '../shared/page-heading';
import { AdminTask } from '../shared/admin-task';

@Component({
  selector: 'app-admin-inventory',
  imports: [AdminPageHeading, PageSkeleton, FormsModule, DatePipe, Icon],
  templateUrl: './inventory.html',
})
export class InventoryPage extends AdminTask {
  readonly stock = computed(
    () => this.api.state()?.products.filter((p) => p.inventory !== 'none') ?? [],
  );
  readonly low = computed(() => this.stock().filter((p) => p.active && p.stock <= p.minimum));
  selectedStock: Product | null = null;
  stockQuantity = 1;
  stockMode = 'bottles';
  stockReason = '';
  openStock(product: Product) {
    this.selectedStock = product;
    this.stockQuantity = 1;
    this.stockMode = product.inventory === 'ml' ? 'bottles' : 'units';
    this.stockReason = '';
  }
  saveStock() {
    const product = this.selectedStock!;
    void this.run(async () => {
      const delta = this.stockQuantity * (this.stockMode === 'bottles' ? product.bottleMl : 1);
      await this.api.request('/admin/products/' + product._id + '/stock', 'POST', {
        delta,
        reason: this.stockReason,
      });
      this.selectedStock = null;
      await this.api.load();
    }, 'Movimiento registrado.');
  }
  availableShots(product: Product) {
    return Math.floor(product.stock / this.api.state()!.settings.servings.shot);
  }
}
