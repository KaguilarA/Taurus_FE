import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Api } from './api';
import { Icon } from './icon';

@Component({
  selector: 'app-setup',
  imports: [FormsModule, Icon],
  host: { '(window:focus)': 'checkAvailability()', '(window:pageshow)': 'checkAvailability()' },
  template: `
    <main class="login-page setup-page">
      <div class="brand">{{ businessName() }}<span>PRIMER PASO · TU CUENTA</span></div>
      <section class="login-card" aria-labelledby="setup-title">
        <p class="eyebrow">BIENVENIDO A TU NEGOCIO</p>
        <h1 id="setup-title">Todo empieza con vos.</h1>
        <p class="muted mb-8">
          Creá la cuenta administradora para abrir tu panel y configurar la carta.
        </p>
        <form class="form-grid" (ngSubmit)="register()">
          <label
            >Tu nombre<input
              name="name"
              [(ngModel)]="name"
              maxlength="100"
              autocomplete="name"
              [disabled]="busy()"
          /></label>
          <label
            >Usuario<input
              name="username"
              [(ngModel)]="username"
              required
              minlength="3"
              maxlength="40"
              pattern="[a-zA-Z0-9][a-zA-Z0-9._-]{2,39}"
              autocomplete="username"
              autocapitalize="none"
              spellcheck="false"
              [disabled]="busy()"
          /></label>
          <label
            >Contraseña<input
              name="password"
              type="password"
              [(ngModel)]="password"
              required
              minlength="12"
              maxlength="200"
              autocomplete="new-password"
              [disabled]="busy()"
          /></label>
          <p class="muted upload-hint">Usá una contraseña única de al menos 12 caracteres.</p>
          <label
            >Confirmar contraseña<input
              name="passwordConfirmation"
              type="password"
              [(ngModel)]="passwordConfirmation"
              required
              minlength="12"
              maxlength="200"
              autocomplete="new-password"
              [disabled]="busy()"
          /></label>
          @if (error()) {
            <p class="alert error" role="alert">{{ error() }}</p>
          }
          <button class="button accent" [disabled]="busy()">
            {{ busy() ? 'Creando tu cuenta…' : 'Crear administrador' }}
            <app-icon name="arrow-up-right" />
          </button>
        </form>
        <p class="setup-note">
          Esta configuración estará disponible únicamente hasta crear el primer administrador.
        </p>
      </section>
    </main>
  `,
})
export class SetupPage {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  readonly businessName = signal('Configuración inicial');
  readonly busy = signal(false);
  readonly error = signal('');
  name = '';
  username = '';
  password = '';
  passwordConfirmation = '';
  constructor() {
    inject(Title).setTitle('Configuración inicial · Administrador');
  }
  async checkAvailability() {
    if (this.busy()) return;
    try {
      if (!(await this.api.request<{ required: boolean }>('/setup/status')).required)
        await this.router.navigateByUrl('/admin', { replaceUrl: true });
    } catch {
      /* The guard and submit endpoint still fail closed. */
    }
  }
  async register() {
    if (this.busy()) return;
    this.error.set('');
    if (this.password !== this.passwordConfirmation) {
      this.error.set('Las contraseñas no coinciden.');
      return;
    }
    this.busy.set(true);
    try {
      await this.api.request('/setup/admin', 'POST', {
        name: this.name,
        username: this.username,
        password: this.password,
        passwordConfirmation: this.passwordConfirmation,
      });
      this.password = this.passwordConfirmation = '';
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
