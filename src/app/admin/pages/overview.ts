import { Component, signal, computed } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';

import { Report, categoryName } from '../../api';
import { Icon } from '../../icon';

import { PageSkeleton } from '../../page-skeleton';
import { AdminPageHeading } from '../shared/page-heading';
import { AdminTask } from '../shared/admin-task';

@Component({
  selector: 'app-admin-overview',
  imports: [AdminPageHeading, PageSkeleton, FormsModule, DatePipe, Icon, RouterLink],
  templateUrl: './overview.html',
})
export class OverviewPage extends AdminTask {
  readonly categoryName = categoryName;
  readonly report = signal<Report>({ revenue: 0, count: 0, ranking: [] });
  readonly stock = computed(
    () => this.api.state()?.products.filter((p) => p.inventory !== 'none') ?? [],
  );
  readonly low = computed(() => this.stock().filter((p) => p.active && p.stock <= p.minimum));
  from = '';
  to = '';
  voidId = '';
  voidReason = '';
  async loadReport() {
    const params = new URLSearchParams();
    if (this.from) params.set('from', new Date(this.from + 'T00:00:00').toISOString());
    if (this.to) {
      const next = new Date(this.to + 'T00:00:00');
      next.setDate(next.getDate() + 1);
      params.set('to', next.toISOString());
    }
    this.report.set(await this.api.request<Report>('/admin/reports?' + params));
  }
  voidSale() {
    void this.run(async () => {
      await this.api.request('/admin/sales/' + this.voidId + '/void', 'POST', {
        reason: this.voidReason,
      });
      this.voidId = '';
      this.voidReason = '';
      await this.api.load();
      await this.loadReport();
    }, 'Venta anulada y existencias devueltas.');
  }
  constructor() {
    super();
    this.initialize(() => this.loadReport());
  }
}
