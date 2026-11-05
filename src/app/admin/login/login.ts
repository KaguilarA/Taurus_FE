import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Icon } from '../../icon';
import type { Settings } from '../../interfaces';
import { Button } from '../../shared/ui';
import { PageSkeleton } from '../../shared/ui/page-skeleton';
import { updateField } from '../../shared/update-field';
import { adminReturnUrl } from '../guards/admin.guards';
import { AdminTask } from '../shared/admin-task';
@Component({
  selector: 'app-admin-login',
  imports: [Button, FormsModule, RouterLink, Icon, PageSkeleton],
  templateUrl: './login.html',
})
export class LoginPage extends AdminTask {
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  public readonly updateField = updateField;
  public readonly businessName = signal('Administración');
  public readonly username = signal('');
  public readonly password = signal('');
  public readonly resetMode = signal(false);
  public readonly resetState = signal('');
  public readonly resetPassword = signal({ password: '', passwordConfirmation: '' });
  constructor() {
    super();
    const title = inject(Title);
    this.initialize(async () => {
      const data = await this.api.request<{
        settings: Settings;
      }>('/public');
      this.businessName.set(data.settings.name);
      title.setTitle(`Ingresar · ${data.settings.name}`);
    });
  }
  public async login(): Promise<void> {
    await this.run(async () => {
      await this.api.login(this.username(), this.password());
      this.password.set('');
      const setup = await this.api.request<{
        businessRequired: boolean;
      }>('/setup/status');
      await this.router.navigateByUrl(
        setup.businessRequired
          ? '/business/setup'
          : adminReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')),
        { replaceUrl: true },
      );
    });
  }
  public requestReset(): void {
    this.run(async () => {
      const result = await this.api.request<{
        state: string;
      }>('/auth/reset/request', 'POST', {
        username: this.username(),
      });
      this.resetState.set(result.state);
      this.notice.set(
        'Solicitud enviada. Un administrador debe aprobarla. Conservá este navegador abierto.',
      );
    });
  }
  public checkReset(): void {
    this.run(async () => {
      this.resetState.set(
        (
          await this.api.request<{
            state: string;
          }>('/auth/reset/status')
        ).state,
      );
    });
  }
  public finishReset(): void {
    this.run(async () => {
      await this.api.request('/auth/reset/complete', 'POST', this.resetPassword());
      this.resetPassword.set({ password: '', passwordConfirmation: '' });
      this.resetMode.set(false);
      this.resetState.set('');
    }, 'Contraseña actualizada. Ya podés iniciar sesión.');
  }
}
