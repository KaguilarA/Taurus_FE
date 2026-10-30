import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { StaffAccount } from '../../api';

import { PageSkeleton } from '../../page-skeleton';
import { AdminPageHeading } from '../shared/page-heading';
import { AdminTask } from '../shared/admin-task';

@Component({
  selector: 'app-admin-profile',
  imports: [AdminPageHeading, PageSkeleton, FormsModule],
  templateUrl: './profile.html',
})
export class ProfilePage extends AdminTask {
  profile: StaffAccount | null = null;
  ownPassword = { currentPassword: '', password: '', passwordConfirmation: '' };
  saveProfile() {
    void this.run(async () => {
      this.profile = await this.api.request<StaffAccount>('/admin/me', 'PUT', this.profile);
    }, 'Perfil actualizado.');
  }
  changeOwnPassword() {
    void this.run(async () => {
      await this.api.request('/admin/me/password', 'PUT', this.ownPassword);
      this.ownPassword = { currentPassword: '', password: '', passwordConfirmation: '' };
    }, 'Contraseña actualizada. Las demás sesiones deberán ingresar de nuevo.');
  }
  constructor() {
    super();
    this.initialize(async () => {
      this.profile = await this.api.request<StaffAccount>('/admin/me');
    });
  }
}
