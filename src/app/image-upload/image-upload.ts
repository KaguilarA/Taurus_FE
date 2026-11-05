import {
  AccordionContent,
  AccordionGroup,
  AccordionPanel,
  AccordionTrigger,
} from '@angular/aria/accordion';
import { Component, inject, input, model, output, signal } from '@angular/core';
import { Api } from '../api';
@Component({
  selector: 'app-image-upload',
  imports: [AccordionGroup, AccordionTrigger, AccordionPanel, AccordionContent],
  templateUrl: './image-upload.html',
})
export class ImageUpload {
  private readonly api = inject(Api);
  public readonly value = model('');
  public readonly label = input('Imagen');
  public readonly purpose = input<'product' | 'promotion' | 'event' | 'branding'>('product');
  public readonly disabled = input(false);
  public readonly pending = output<boolean>();
  public readonly uploading = signal(false);
  public readonly error = signal('');
  public readonly notice = signal('');
  public setUrl(event: Event): void {
    this.value.set((event.target as HTMLInputElement).value);
    this.notice.set('');
  }
  public async select(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    input.value = '';
    if (!file || this.uploading() || this.disabled()) return;
    this.error.set('');
    this.notice.set('');
    if (
      !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
      file.size > 5 * 1024 * 1024
    ) {
      this.error.set('Elegí una imagen JPG, PNG o WebP de hasta 5 MB.');
      return;
    }
    this.uploading.set(true);
    this.pending.emit(true);
    try {
      const result = await this.api.uploadImage(file, this.purpose());
      this.value.set(result.url);
      const stats = result.optimization;
      const saved =
        stats && stats.originalBytes > 0
          ? Math.round((stats.savedBytes / stats.originalBytes) * 100)
          : 0;
      this.notice.set(
        saved > 0
          ? `Imagen optimizada: ${saved}% menos peso. Guardá los cambios para publicarla.`
          : 'Imagen subida. Guardá los cambios para publicarla.',
      );
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo subir la imagen.');
    } finally {
      this.uploading.set(false);
      this.pending.emit(false);
    }
  }
}
