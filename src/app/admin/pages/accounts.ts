import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { StaffAccount, Role } from '../../api';

import { PageSkeleton } from '../../page-skeleton';
import { AdminPageHeading } from '../shared/page-heading';
import { AdminTask } from '../shared/admin-task';

@Component({
  selector: 'app-admin-accounts',
  imports: [AdminPageHeading, PageSkeleton, FormsModule, DatePipe],
  templateUrl: './accounts.html',
})
export class AccountsPage extends AdminTask {
  readonly accounts = signal<StaffAccount[]>([]);
  staff = { name: '', username: '', password: '', role: 'waiter' as Role };
  readonly resetRequests = signal<
    { _id: string; account?: { name: string; username: string }; createdAt: string }[]
  >([]);
  loadResets() {
    void this.run(async () => {
      this.resetRequests.set(await this.api.request('/admin/password-resets'));
    });
  }
  decideReset(id: string, state: string) {
    void this.run(async () => {
      await this.api.request('/admin/password-resets/' + id, 'PATCH', { state });
      this.resetRequests.set(await this.api.request('/admin/password-resets'));
    }, 'Solicitud atendida.');
  }
  async loadAccounts() {
    this.accounts.set(await this.api.request<StaffAccount[]>('/admin/accounts'));
  }
  createAccount() {
    void this.run(async () => {
      await this.api.request('/admin/accounts', 'POST', this.staff);
      this.staff = { name: '', username: '', password: '', role: 'waiter' };
      await this.loadAccounts();
    }, 'Acceso creado para el equipo.');
  }
  constructor() {
    super();
    this.initialize(() => this.loadAccounts());
  }
}
