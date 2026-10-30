import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ImageUpload } from './image-upload';
import { Api } from './api';

describe('Image uploads through the backend', () => {
  const event = (file: File) =>
    ({ target: { files: [file], value: 'image.png' } }) as unknown as Event;
  afterEach(() => vi.restoreAllMocks());
  it('sends multipart to the API with credentials and lets the browser set its boundary', async () => {
    const api = TestBed.inject(Api);
    const file = new File(['image'], 'image.png', { type: 'image/png' });
    const fetcher = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValue(
        new Response(JSON.stringify({ url: 'https://res.cloudinary.com/sample/image.png' }), {
          status: 201,
        }),
      );
    await api.uploadImage(file, 'product');
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('/api/admin/images?purpose=product');
    expect(options?.credentials).toBe('include');
    expect(options?.body).toBeInstanceOf(FormData);
    expect((options?.body as FormData).get('image')).toBe(file);
    expect(options?.headers).toEqual({});
  });
  it('keeps the previous image on failure and releases the save lock', async () => {
    const fixture = TestBed.createComponent(ImageUpload);
    const component = fixture.componentInstance;
    component.value.set('/images/burger.svg');
    vi.spyOn(TestBed.inject(Api), 'uploadImage').mockRejectedValue(
      new Error('Servidor no disponible'),
    );
    const pending: boolean[] = [];
    component.pending.subscribe((value) => pending.push(value));
    await component.select(event(new File(['png'], 'photo.png', { type: 'image/png' })));
    expect(component.value()).toBe('/images/burger.svg');
    expect(component.error()).toBe('Servidor no disponible');
    expect(pending).toEqual([true, false]);
  });
  it('updates the preview after uploading and asks to save before publishing', async () => {
    const component = TestBed.createComponent(ImageUpload).componentInstance;
    vi.spyOn(TestBed.inject(Api), 'uploadImage').mockResolvedValue({
      url: 'https://res.cloudinary.com/sample/new.png',
    });
    await component.select(event(new File(['png'], 'photo.png', { type: 'image/png' })));
    expect(component.value()).toBe('https://res.cloudinary.com/sample/new.png');
    expect(component.notice()).toContain('Guardá los cambios');
    expect(component.uploading()).toBe(false);
  });
  it('rejects unsupported and oversized files without sending them', async () => {
    const component = TestBed.createComponent(ImageUpload).componentInstance;
    const upload = vi.spyOn(TestBed.inject(Api), 'uploadImage');
    await component.select(event(new File(['<svg/>'], 'photo.svg', { type: 'image/svg+xml' })));
    await component.select(
      event(new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })),
    );
    expect(upload).not.toHaveBeenCalled();
    expect(component.error()).toContain('5 MB');
  });
});
