import { DatePipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../../icon';
import type { Product } from '../../../interfaces';
import { CatalogFilters, CatalogState, Pagination } from '../../../shared/catalog';
import { Button, Dialog, Feedback } from '../../../shared/ui';
import { PageSkeleton } from '../../../shared/ui/page-skeleton';
import { AdminTask } from '../../shared/admin-task';
import { AdminPageHeading } from '../../shared/page-heading';
import { InvoiceImport } from './invoice-import';
@Component({
  selector: 'app-admin-inventory',
  imports: [
    InvoiceImport,
    CatalogFilters,
    Pagination,
    Dialog,
    Button,
    Feedback,
    AdminPageHeading,
    PageSkeleton,
    FormsModule,
    DatePipe,
    Icon,
  ],
  templateUrl: './inventory.html',
})
export class InventoryPage extends AdminTask {
  public readonly showInvoice = signal(false);
  public readonly stock = computed(
    () => this.api.state()?.products.filter((p) => p.inventory !== 'none') ?? [],
  );
  public readonly catalog = new CatalogState(this.stock);
  public readonly low = computed(() =>
    this.stock().filter((p) => p.active && p.stock <= p.minimum),
  );
  public readonly selectedStock = signal<Product | null>(null);
  public readonly stockQuantity = signal(1);
  public readonly stockMode = signal('bottles');
  public readonly stockReason = signal('');
  public openStock(product: Product): void {
    this.selectedStock.set(product);
    this.stockQuantity.set(1);
    this.stockMode.set(product.inventory === 'ml' ? 'bottles' : 'units');
    this.stockReason.set('');
  }
  public saveStock(): void {
    const product = this.selectedStock()!;
    this.run(async () => {
      const delta = this.stockQuantity() * (this.stockMode() === 'bottles' ? product.bottleMl : 1);
      await this.api.request('/admin/products/' + product._id + '/stock', 'POST', {
        delta,
        reason: this.stockReason(),
      });
      this.selectedStock.set(null);
      await this.api.load();
    }, 'Movimiento registrado.');
  }
  public availableShots(product: Product): number {
    return Math.floor(product.stock / this.api.state()!.settings.servings.shot);
  }
}
