import { Component, inject, input, model, output, signal } from '@angular/core';
import { Api } from './api';

@Component({
  selector: 'app-image-upload',
  template: `
    <div class="image-uploader" [attr.aria-busy]="uploading()">
      <span class="image-upload-label">{{ label() }}</span>
      @if (value()) {
        <img class="upload-preview" [src]="value()" alt="Vista previa de la imagen seleccionada" />
      }
      <label class="image-file-label">
        {{ uploading() ? 'Optimizando y subiendo…' : value() ? 'Cambiar imagen' : 'Seleccionar imagen' }}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          [disabled]="disabled() || uploading()"
          (change)="select($event)"
          [attr.aria-label]="label()"
        />
      </label>
      <p class="upload-hint">JPG, PNG o WebP · Máximo 5 MB · Optimización automática</p>
      @if (error()) {
        <p class="alert error" role="alert">{{ error() }}</p>
      }
      @if (notice()) {
        <p class="upload-notice" role="status">{{ notice() }}</p>
      }
      <details>
        <summary>Usar una dirección de imagen</summary>
        <input
          type="text"
          [value]="value()"
          [disabled]="disabled() || uploading()"
          (input)="setUrl($event)"
          aria-label="Dirección de la imagen"
          placeholder="https://… o /images/…"
        />
      </details>
    </div>
  `,
})
export class ImageUpload {
  private readonly api = inject(Api);
  readonly value = model('');
  readonly label = input('Imagen');
  readonly purpose = input<'product' | 'promotion' | 'event' | 'branding'>('product');
  readonly disabled = input(false);
  readonly pending = output<boolean>();
  readonly uploading = signal(false);
  readonly error = signal('');
  readonly notice = signal('');
  setUrl(event: Event) {
    this.value.set((event.target as HTMLInputElement).value);
    this.notice.set('');
  }
  async select(event: Event) {
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
      const saved = stats && stats.originalBytes > 0
        ? Math.round((stats.savedBytes / stats.originalBytes) * 100)
        : 0;
      this.notice.set(saved > 0
        ? `Imagen optimizada: ${saved}% menos peso. Guardá los cambios para publicarla.`
        : 'Imagen subida. Guardá los cambios para publicarla.');
    } catch (error) {
      this.error.set(error instanceof Error ? error.message : 'No se pudo subir la imagen.');
    } finally {
      this.uploading.set(false);
      this.pending.emit(false);
    }
  }
}
