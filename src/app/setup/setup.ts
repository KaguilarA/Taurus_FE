import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Api } from '../api';
import { Icon } from '../icon';
import { Button } from '../shared/ui';
@Component({
  selector: 'app-setup',
  imports: [Button, FormsModule, Icon],
  host: { '(window:focus)': 'checkAvailability()', '(window:pageshow)': 'checkAvailability()' },
  templateUrl: './setup.html',
})
export class SetupPage {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  public readonly businessName = signal('Configuración inicial');
  public readonly busy = signal(false);
  public readonly error = signal('');
  public readonly name = signal('');
  public readonly username = signal('');
  public readonly password = signal('');
  public readonly passwordConfirmation = signal('');
  constructor() {
    inject(Title).setTitle('Configuración inicial · Administrador');
  }
  public async checkAvailability(): Promise<void> {
    if (this.busy()) return;
    try {
      if (
        !(
          await this.api.request<{
            required: boolean;
          }>('/setup/status')
        ).required
      )
        await this.router.navigateByUrl('/admin', { replaceUrl: true });
    } catch {
      /* The guard and submit endpoint still fail closed. */
    }
  }
  public async register(): Promise<void> {
    if (this.busy()) return;
    this.error.set('');
    if (this.password() !== this.passwordConfirmation()) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }
    this.busy.set(true);
    try {
      await this.api.request('/setup/admin', 'POST', {
        name: this.name(),
        username: this.username(),
        password: this.password(),
        passwordConfirmation: this.passwordConfirmation(),
      });
      this.password.set('');
      this.passwordConfirmation.set('');
      await this.router.navigateByUrl('/business/setup', { replaceUrl: true });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo crear la cuenta.');
      this.busy.set(false);
      await this.checkAvailability();
    } finally {
      this.busy.set(false);
    }
  }
}
