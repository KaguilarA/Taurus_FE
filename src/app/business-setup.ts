import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Title } from '@angular/platform-browser';
import { Api, Settings } from './api';
import { ImageUpload } from './image-upload';
import { Icon } from './icon';

@Component({
  selector: 'app-business-setup',
  imports: [FormsModule, ImageUpload, Icon],
  template: `
    <main class="business-onboarding">
      <header>
        <p class="eyebrow">SEGUNDO PASO · TU NEGOCIO</p>
        <h1>Ahora, hacelo tuyo.</h1>
        <p class="muted">
          Tu cuenta ya está lista. Completá la información que aparecerá en tu carta.
        </p>
      </header>
      <form class="panel form-grid p-6" (ngSubmit)="save()">
        <div class="grid sm:grid-cols-2 gap-4">
          <label
            >Nombre del negocio<input
              name="businessName"
              [(ngModel)]="business.name"
              required
              maxlength="150"
              autocomplete="organization"
          /></label>
          <label
            >Tipo de negocio<input
              name="subtitle"
              [(ngModel)]="business.subtitle"
              maxlength="150"
              placeholder="Ej. Restaurante, bar y pub"
          /></label>
        </div>
        <label
          >Eslogan<input name="tagline" [(ngModel)]="business.tagline" maxlength="200"
        /></label>
        <label
          >Descripción<textarea
            name="description"
            [(ngModel)]="business.description"
            maxlength="500"
            rows="3"
          ></textarea>
        </label>
        <div class="grid sm:grid-cols-2 gap-4">
          <label
            >Dirección<input
              name="address"
              [(ngModel)]="business.address"
              maxlength="500"
              autocomplete="street-address"
          /></label>
          <label
            >Teléfono<input
              name="phone"
              [(ngModel)]="business.phone"
              maxlength="50"
              autocomplete="tel"
          /></label>
        </div>
        <label>Horario<input name="hours" [(ngModel)]="business.hours" maxlength="500" /></label>
        <app-image-upload
          [(value)]="business.heroImage"
          purpose="branding"
          label="Imagen principal de la carta"
          [disabled]="busy()"
          (pending)="uploading.set($event)"
        />
        <div class="grid sm:grid-cols-2 gap-4">
          <label
            >Moneda (código ISO)<input
              name="currency"
              [(ngModel)]="business.currency"
              required
              pattern="[A-Z]{3}"
              maxlength="3"
          /></label>
          <label
            >Color de marca<input name="accent" type="color" [(ngModel)]="business.accent" required
          /></label>
        </div>
        <details>
          <summary>Medidas de las bebidas</summary>
          <div class="grid sm:grid-cols-3 gap-4 mt-4">
            <label
              >Shot (ml)<input
                name="shot"
                type="number"
                [(ngModel)]="business.servings.shot"
                required
                min="1"
                max="10000"
            /></label>
            <label
              >Pequeño (ml)<input
                name="small"
                type="number"
                [(ngModel)]="business.servings.small"
                required
                min="1"
                max="10000"
            /></label>
            <label
              >Grande (ml)<input
                name="large"
                type="number"
                [(ngModel)]="business.servings.large"
                required
                min="1"
                max="10000"
            /></label>
          </div>
        </details>
        @if (error()) {
          <p class="alert error" role="alert">{{ error() }}</p>
        }
        <button class="button accent" [disabled]="busy() || uploading()">
          {{ busy() ? 'Guardando…' : 'Guardar negocio y entrar al panel' }}
          <app-icon name="arrow-up-right" />
        </button>
      </form>
    </main>
  `,
})
export class BusinessSetupPage {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  readonly busy = signal(false);
  readonly uploading = signal(false);
  readonly error = signal('');
  // Editable UI suggestions; the backend never seeds business values.
  business: Settings = {
    name: '',
    subtitle: '',
    tagline: '',
    description: '',
    heroImage: '',
    address: '',
    phone: '',
    hours: '',
    currency: 'CRC',
    accent: '#F5A623',
    servings: { shot: 30, small: 60, large: 90 },
  };
  constructor() {
    inject(Title).setTitle('Información del negocio');
    void this.api
      .request<{ settings: Settings | null }>('/public')
      .then((data) => {
        if (data.settings)
          this.business = {
            ...this.business,
            ...data.settings,
            servings: { ...this.business.servings, ...data.settings.servings },
          };
      })
      .catch(() => {});
  }
  async save() {
    if (this.busy() || this.uploading()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.request('/admin/settings', 'PUT', this.business);
      await this.router.navigateByUrl('/admin', { replaceUrl: true });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo guardar el negocio.');
    } finally {
      this.busy.set(false);
    }
  }
}
