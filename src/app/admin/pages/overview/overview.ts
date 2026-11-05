import { DatePipe } from '@angular/common';
import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { categoryName } from '../../../api';
import { Icon } from '../../../icon';
import type { Report } from '../../../interfaces';
import { RecommendedProducts } from '../../../shared/catalog';
import { DeferredError } from '../../../shared/deferred-error';
import { SalesInsights } from '../../../shared/sales';
import { Button, Dialog, Feedback, StatCard } from '../../../shared/ui';
import { PageSkeleton } from '../../../shared/ui/page-skeleton';
import { AdminTask } from '../../shared/admin-task';
import { AdminPageHeading } from '../../shared/page-heading';
@Component({
  selector: 'app-admin-overview',
  imports: [
    RecommendedProducts,
    SalesInsights,
    Dialog,
    Button,
    Feedback,
    StatCard,
    DeferredError,
    AdminPageHeading,
    PageSkeleton,
    FormsModule,
    DatePipe,
    Icon,
    RouterLink,
  ],
  templateUrl: './overview.html',
})
export class OverviewPage extends AdminTask {
  public readonly categoryName = categoryName;
  public readonly report = signal<Report>({ revenue: 0, count: 0, ranking: [] });
  public readonly stock = computed(
    () => this.api.state()?.products.filter((p) => p.inventory !== 'none') ?? [],
  );
  public readonly low = computed(() =>
    this.stock().filter((p) => p.active && p.stock <= p.minimum),
  );
  public readonly from = signal('');
  public readonly to = signal('');
  public readonly voidId = signal('');
  public readonly voidReason = signal('');
  constructor() {
    super();
    this.initialize(() => this.loadReport());
  }
  public async loadReport(): Promise<void> {
    const params = new URLSearchParams();
    if (this.from()) params.set('from', new Date(this.from() + 'T00:00:00').toISOString());
    if (this.to()) {
      const next = new Date(this.to() + 'T00:00:00');
      next.setDate(next.getDate() + 1);
      params.set('to', next.toISOString());
    }
    this.report.set(await this.api.request<Report>('/admin/reports?' + params));
  }
  public voidSale(): void {
    this.run(async () => {
      await this.api.request('/admin/sales/' + this.voidId() + '/void', 'POST', {
        reason: this.voidReason(),
      });
      this.voidId.set('');
      this.voidReason.set('');
      await this.api.load();
      await this.loadReport();
    }, 'Venta anulada y existencias devueltas.');
  }
}
