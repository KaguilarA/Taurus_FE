import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { StaffAccount } from '../../../interfaces';
import { Button, Feedback } from '../../../shared/ui';
import { PageSkeleton } from '../../../shared/ui/page-skeleton';
import { updateField } from '../../../shared/update-field';
import { AdminTask } from '../../shared/admin-task';
import { AdminPageHeading } from '../../shared/page-heading';
@Component({
  selector: 'app-admin-profile',
  imports: [Button, Feedback, AdminPageHeading, PageSkeleton, FormsModule],
  templateUrl: './profile.html',
})
export class ProfilePage extends AdminTask {
  public readonly updateField = updateField;
  public readonly profile = signal<StaffAccount | null>(null);
  public readonly ownPassword = signal({
    currentPassword: '',
    password: '',
    passwordConfirmation: '',
  });
  constructor() {
    super();
    this.initialize(async () => {
      this.profile.set(await this.api.request<StaffAccount>('/admin/me'));
    });
  }
  public saveProfile(): void {
    this.run(async () => {
      this.profile.set(await this.api.request<StaffAccount>('/admin/me', 'PUT', this.profile()));
    }, 'Perfil actualizado.');
  }
  public changeOwnPassword(): void {
    this.run(async () => {
      await this.api.request('/admin/me/password', 'PUT', this.ownPassword());
      this.ownPassword.set({ currentPassword: '', password: '', passwordConfirmation: '' });
    }, 'Contraseña actualizada. Las demás sesiones deberán ingresar de nuevo.');
  }
}
