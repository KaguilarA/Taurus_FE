import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { Role, StaffAccount, StaffPasswordReset } from '../../../interfaces';
import { Button, Dialog, Feedback } from '../../../shared/ui';
import { PageSkeleton } from '../../../shared/ui/page-skeleton';
import { updateField } from '../../../shared/update-field';
import { AdminTask } from '../../shared/admin-task';
import { AdminPageHeading } from '../../shared/page-heading';
@Component({
  selector: 'app-admin-accounts',
  imports: [Button, Dialog, Feedback, AdminPageHeading, PageSkeleton, FormsModule, DatePipe],
  templateUrl: './accounts.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccountsPage extends AdminTask {
  public readonly updateField = updateField;
  public readonly accounts = signal<StaffAccount[]>([]);
  public readonly editing = signal<StaffAccount | null>(null);
  public readonly replacementPassword = signal({ password: '', passwordConfirmation: '' });
  public readonly ownId = signal('');
  public readonly staff = signal({ name: '', username: '', password: '', role: 'waiter' as Role });
  public readonly resetRequests = signal<StaffPasswordReset[]>([]);
  constructor() {
    super();
    this.initialize(async () => {
      const [, own] = await Promise.all([
        this.loadAccounts(),
        this.api.request<StaffAccount>('/admin/me'),
      ]);
      this.ownId.set(own._id);
    });
  }
  public editAccount(account: StaffAccount): void {
    if (account._id === this.ownId()) return;
    this.editing.set({ ...account });
    this.replacementPassword.set({ password: '', passwordConfirmation: '' });
    this.error.set('');
    this.notice.set('');
  }
  public closeEditor(): void {
    this.editing.set(null);
    this.replacementPassword.set({ password: '', passwordConfirmation: '' });
  }
  public async saveAccount(): Promise<void> {
    const account = this.editing();
    if (!account) return;
    const roleChanged =
      account.role !== this.accounts().find((item) => item._id === account._id)?.role;
    await this.run(
      async () => {
        const updated = await this.api.request<StaffAccount>(
          '/admin/accounts/' + account._id,
          'PUT',
          {
            name: account.name,
            username: account.username,
            ...(roleChanged ? { role: account.role } : {}),
          },
        );
        this.editing.set(updated);
        this.accounts.update((accounts) =>
          accounts.map((item) => (item._id === updated._id ? updated : item)),
        );
      },
      roleChanged
        ? 'Perfil y rol actualizados. La cuenta deberá ingresar de nuevo.'
        : 'Perfil actualizado.',
    );
  }
  public async resetPassword(): Promise<void> {
    const account = this.editing();
    if (!account) return;
    await this.run(async () => {
      await this.api.request(
        '/admin/accounts/' + account._id + '/password',
        'PUT',
        this.replacementPassword(),
      );
      this.replacementPassword.set({ password: '', passwordConfirmation: '' });
    }, 'Contraseña restablecida. El usuario deberá iniciar sesión de nuevo.');
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
