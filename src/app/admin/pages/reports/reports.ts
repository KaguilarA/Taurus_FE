import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { categoryName } from '../../../api';
import { Icon } from '../../../icon';
import type { Report } from '../../../interfaces';
import { DeferredError } from '../../../shared/deferred-error';
import { SalesInsights } from '../../../shared/sales';
import { Button, Feedback, StatCard } from '../../../shared/ui';
import { PageSkeleton } from '../../../shared/ui/page-skeleton';
import { AdminTask } from '../../shared/admin-task';
import { AdminPageHeading } from '../../shared/page-heading';
@Component({
  selector: 'app-admin-reports',
  imports: [
    SalesInsights,
    Button,
    Feedback,
    StatCard,
    DeferredError,
    AdminPageHeading,
    PageSkeleton,
    FormsModule,
    Icon,
  ],
  templateUrl: './reports.html',
})
export class ReportsPage extends AdminTask {
  public readonly report = signal<Report>({ revenue: 0, count: 0, ranking: [] });
  public readonly from = signal('');
  public readonly to = signal('');
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
  public refreshReport(): void {
    this.run(() => this.loadReport());
  }
  public exportCsv(): void {
    const rows = [
      ['Producto', 'Categoría', 'Unidades vendidas', 'Ingresos'],
      ...this.report().ranking.map((p) => [
        p.name,
        categoryName(p._id.category),
        p.quantity,
        p.revenue,
      ]),
    ];
    const csv =
      '\ufeff' +
      rows
        .map((row) =>
          row
            .map(
              (cell) =>
                '"' +
                String(cell)
                  .replace(/^[=+@-]/, "'$&")
                  .replaceAll('"', '""') +
                '"',
            )
            .join(','),
        )
        .join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ventas.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  constructor() {
    super();
    this.initialize(() => this.loadReport());
  }
}
