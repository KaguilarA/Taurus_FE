import { DatePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Role, StaffAccount } from '../../../interfaces';
import { Button, Feedback } from '../../../shared/ui';
import { PageSkeleton } from '../../../shared/ui/page-skeleton';
import { updateField } from '../../../shared/update-field';
import { AdminTask } from '../../shared/admin-task';
import { AdminPageHeading } from '../../shared/page-heading';
@Component({
  selector: 'app-admin-accounts',
  imports: [Button, Feedback, AdminPageHeading, PageSkeleton, FormsModule, DatePipe],
  templateUrl: './accounts.html',
})
export class AccountsPage extends AdminTask {
  public readonly updateField = updateField;
  public readonly accounts = signal<StaffAccount[]>([]);
  public readonly staff = signal({ name: '', username: '', password: '', role: 'waiter' as Role });
  public readonly resetRequests = signal<
    {
      _id: string;
      account?: {
        name: string;
        username: string;
      };
      createdAt: string;
    }[]
  >([]);
  constructor() {
    super();
    this.initialize(() => this.loadAccounts());
  }
  public loadResets(): void {
    this.run(async () => {
      this.resetRequests.set(await this.api.request('/admin/password-resets'));
    });
  }
  public decideReset(id: string, state: string): void {
    this.run(async () => {
      await this.api.request('/admin/password-resets/' + id, 'PATCH', { state });
      this.resetRequests.set(await this.api.request('/admin/password-resets'));
    }, 'Solicitud atendida.');
  }
  public async loadAccounts(): Promise<void> {
    this.accounts.set(await this.api.request<StaffAccount[]>('/admin/accounts'));
  }
  public createAccount(): void {
    this.run(async () => {
      await this.api.request('/admin/accounts', 'POST', this.staff());
      this.staff.set({ name: '', username: '', password: '', role: 'waiter' });
      await this.loadAccounts();
    }, 'Acceso creado para el equipo.');
  }
}
