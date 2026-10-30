import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Icon } from '../../icon';
import { Settings } from '../../api';
import { PageSkeleton } from '../../page-skeleton';
import { Title } from '@angular/platform-browser';
import { AdminTask } from '../shared/admin-task';
import { adminReturnUrl } from '../admin.guards';

@Component({
  selector: 'app-admin-login',
  imports: [FormsModule, RouterLink, Icon, PageSkeleton],
  templateUrl: './login.html',
})
export class LoginPage extends AdminTask {
  readonly businessName = signal('Administración');
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  constructor() {
    super();
    const title = inject(Title);
    this.initialize(async () => {
      const data = await this.api.request<{ settings: Settings }>('/public');
      this.businessName.set(data.settings.name);
      title.setTitle(`Ingresar · ${data.settings.name}`);
    });
  }

  async login() {
    await this.run(async () => {
      await this.api.login(this.username, this.password);
      this.password = '';
      const setup = await this.api.request<{ businessRequired: boolean }>('/setup/status');
      await this.router.navigateByUrl(
        setup.businessRequired
          ? '/business/setup'
          : adminReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
        { replaceUrl: true },
      );
    });
  }
  username = '';
  password = '';
  resetMode = false;
  resetState = '';
  resetPassword = { password: '', passwordConfirmation: '' };
  requestReset() {
    void this.run(async () => {
      const result = await this.api.request<{ state: string }>('/auth/reset/request', 'POST', {
        username: this.username,
      });
      this.resetState = result.state;
      this.notice.set(
        'Solicitud enviada. Un administrador debe aprobarla. Conservá este navegador abierto.',
      );
    });
  }
  checkReset() {
    void this.run(async () => {
      this.resetState = (await this.api.request<{ state: string }>('/auth/reset/status')).state;
    });
  }
  finishReset() {
    void this.run(async () => {
      await this.api.request('/auth/reset/complete', 'POST', this.resetPassword);
      this.resetPassword = { password: '', passwordConfirmation: '' };
      this.resetMode = false;
      this.resetState = '';
    }, 'Contraseña actualizada. Ya podés iniciar sesión.');
  }
}
