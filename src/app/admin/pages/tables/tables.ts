import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Icon } from '../../../icon';
import type { DiningTable } from '../../../interfaces';
import { Button, Feedback } from '../../../shared/ui';
import { PageSkeleton } from '../../../shared/ui/page-skeleton';
import { AdminTask } from '../../shared/admin-task';
import { AdminPageHeading } from '../../shared/page-heading';
@Component({
  selector: 'app-admin-tables',
  imports: [Button, Feedback, FormsModule, AdminPageHeading, PageSkeleton, Icon, RouterLink],
  templateUrl: './tables.html',
})
export class TablesPage extends AdminTask {
  private readonly router = inject(Router);
  public readonly tables = signal<DiningTable[]>([]);
  public readonly tableLinks = computed(
    () =>
      new Map(
        this.tables().map((table) => {
          try {
            const url = new URL(table.url);
            return [
              table._id,
              url.pathname === '/cuenta'
                ? this.router.parseUrl(url.pathname + url.search + url.hash)
                : null,
            ] as const;
          } catch {
            return [table._id, null] as const;
          }
        }),
      ),
  );
  public readonly tableName = signal('');
  constructor() {
    super();
    this.initialize(() => this.loadTables());
  }
  public async loadTables(): Promise<void> {
    this.tables.set(await this.api.request<DiningTable[]>('/admin/tables'));
  }
  public createTable(): void {
    this.run(async () => {
      await this.api.request('/admin/tables', 'POST', { name: this.tableName() });
      this.tableName.set('');
      await this.loadTables();
    }, 'Mesa creada. El QR está listo para descargar.');
  }
  public toggleTable(table: DiningTable): void {
    this.run(async () => {
      await this.api.request('/admin/tables/' + table._id, 'PATCH', { active: !table.active });
      await this.loadTables();
    });
  }
}
