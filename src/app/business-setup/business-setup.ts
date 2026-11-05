import {
  AccordionContent,
  AccordionGroup,
  AccordionPanel,
  AccordionTrigger,
} from '@angular/aria/accordion';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Title } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { Api } from '../api';
import { Icon } from '../icon';
import { ImageUpload } from '../image-upload';
import type { Settings } from '../interfaces';
import { Button } from '../shared/ui';
import { updateField } from '../shared/update-field';
@Component({
  selector: 'app-business-setup',
  imports: [
    AccordionGroup,
    AccordionTrigger,
    AccordionPanel,
    AccordionContent,
    Button,
    FormsModule,
    ImageUpload,
    Icon,
  ],
  templateUrl: './business-setup.html',
})
export class BusinessSetupPage {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  public readonly updateField = updateField;
  public readonly busy = signal(false);
  public readonly uploading = signal(false);
  public readonly error = signal('');
  // Editable UI suggestions; the backend never seeds business values.
  public readonly business = signal<Settings>({
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
  });
  constructor() {
    inject(Title).setTitle('Información del negocio');
    this.api
      .request<{
        settings: Settings | null;
      }>('/public')
      .then((data) => {
        if (data.settings)
          this.business.set({
            ...this.business(),
            ...data.settings,
            servings: { ...this.business().servings, ...data.settings.servings },
          });
      })
      .catch(() => {});
  }
  public async save(): Promise<void> {
    if (this.busy() || this.uploading()) return;
    this.busy.set(true);
    this.error.set('');
    try {
      await this.api.request('/admin/settings', 'PUT', this.business());
      await this.router.navigateByUrl('/admin', { replaceUrl: true });
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo guardar el negocio.');
    } finally {
      this.busy.set(false);
    }
  }
}
