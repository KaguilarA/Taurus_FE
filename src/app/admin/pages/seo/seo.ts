import { ChangeDetectionStrategy, Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { SeoSettings } from '../../../interfaces';
import { ImageUpload } from '../../../image-upload';
import { Button, Feedback } from '../../../shared/ui';
import { PageSkeleton } from '../../../shared/ui/page-skeleton';
import { updateField } from '../../../shared/update-field';
import { AdminTask } from '../../shared/admin-task';
import { AdminPageHeading } from '../../shared/page-heading';

@Component({
  selector: 'app-admin-seo',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ImageUpload, Button, Feedback, PageSkeleton, AdminPageHeading],
  templateUrl: './seo.html',
})
export class SeoPage extends AdminTask {
  public readonly updateField = updateField;
  public readonly seo = signal<SeoSettings>({
    title: '',
    description: '',
    shareTitle: '',
    shareDescription: '',
    shareImage: '',
    locale: 'es_CR',
    indexable: true,
    includeProducts: true,
  });
  public readonly businessName = computed(() => this.api.state()?.settings.name ?? '');
  public readonly businessDescription = computed(
    () => this.api.state()?.settings.description ?? '',
  );
  public readonly defaultTitle = computed(() =>
    [this.businessName(), this.api.state()?.settings.subtitle].filter(Boolean).join(' · '),
  );
  public readonly previewImage = computed(
    () =>
      this.seo().shareImage ||
      this.api.state()?.settings.logoImage ||
      this.api.state()?.settings.heroImage ||
      '',
  );
  public readonly previewTitle = computed(() => this.seo().title || this.defaultTitle());
  public readonly previewDescription = computed(
    () => this.seo().description || this.businessDescription(),
  );
  constructor() {
    super();
    this.initialize(async () => {
      const settings = await this.api.request<SeoSettings>('/admin/seo');
      this.seo.update((defaults) => ({ ...defaults, ...settings }));
    });
  }
  public async save(): Promise<void> {
    await this.run(
      async () =>
        this.seo.set(await this.api.request<SeoSettings>('/admin/seo', 'PUT', this.seo())),
      'SEO guardado. Los enlaces compartidos y buscadores pueden tardar hasta 30 segundos en recibir los cambios; sus propias vistas previas pueden conservar una caché adicional.',
    );
  }
}
