import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DiningTable } from '../../api';
import { Icon } from '../../icon';

import { PageSkeleton } from '../../page-skeleton';
import { AdminPageHeading } from '../shared/page-heading';
import { AdminTask } from '../shared/admin-task';

@Component({
  selector: 'app-admin-tables',
  imports: [AdminPageHeading, PageSkeleton, FormsModule, Icon],
  templateUrl: './tables.html',
})
export class TablesPage extends AdminTask {
  readonly tables = signal<DiningTable[]>([]);
  tableName = '';
  async loadTables() {
    this.tables.set(await this.api.request<DiningTable[]>('/admin/tables'));
  }
  createTable() {
    void this.run(async () => {
      await this.api.request('/admin/tables', 'POST', { name: this.tableName });
      this.tableName = '';
      await this.loadTables();
    }, 'Mesa creada. El QR está listo para descargar.');
  }
  toggleTable(table: DiningTable) {
    void this.run(async () => {
      await this.api.request('/admin/tables/' + table._id, 'PATCH', { active: !table.active });
      await this.loadTables();
    });
  }
  constructor() {
    super();
    this.initialize(() => this.loadTables());
  }
}
