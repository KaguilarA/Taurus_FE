import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Api } from '../../../api';
import type { SeoSettings, State } from '../../../interfaces';
import { SeoPage } from './seo';

it('loads SEO separately, previews changes, and saves through the administrator endpoint', async () => {
  TestBed.configureTestingModule({ imports: [SeoPage] });
  const api = TestBed.inject(Api);
  api.state.set({
    settings: { name: 'Independent business', description: 'Original business description' },
  } as State);
  const initial: SeoSettings = {
    title: '',
    description: '',
    shareTitle: '',
    shareDescription: '',
    shareImage: '',
    locale: 'es_CR',
    indexable: true,
    includeProducts: true,
  };
  const request = vi
    .spyOn(api, 'request')
    .mockImplementation(
      async (_path, method, body) => (method === 'PUT' ? body : initial) as never,
    );
  const fixture = TestBed.createComponent(SeoPage);
  fixture.detectChanges();
  await fixture.whenStable();
  await vi.waitFor(() => expect(fixture.componentInstance.loading()).toBe(false));
  fixture.detectChanges();
  expect(request).toHaveBeenCalledWith('/admin/seo');
  expect(fixture.componentInstance.previewTitle()).toBe('Independent business');
  fixture.componentInstance.seo.update((seo) => ({
    ...seo,
    title: 'Custom SEO',
    description: 'Search text',
    shareTitle: 'Social text',
  }));
  fixture.detectChanges();
  expect(fixture.nativeElement.textContent).toContain('Custom SEO');
  await fixture.componentInstance.save();
  expect(request).toHaveBeenLastCalledWith(
    '/admin/seo',
    'PUT',
    expect.objectContaining({ title: 'Custom SEO', shareTitle: 'Social text' }),
  );
  expect(api.state()?.settings.description).toBe('Original business description');
  expect(fixture.componentInstance.notice()).toContain('SEO guardado');
});

it('shows public discovery files inside SEO without navigating or opening another tab', async () => {
  TestBed.configureTestingModule({ imports: [SeoPage] });
  vi.spyOn(TestBed.inject(Api), 'request').mockResolvedValue({} as never);
  const fixture = TestBed.createComponent(SeoPage);
  fixture.detectChanges();
  await fixture.whenStable();
  await vi.waitFor(() => expect(fixture.componentInstance.loading()).toBe(false));
  const fetch = vi
    .spyOn(globalThis, 'fetch')
    .mockResolvedValue(new Response('<urlset><url>https://business.test/</url></urlset>'));
  try {
    await fixture.componentInstance.showDiscovery('sitemap.xml');
    fixture.detectChanges();
    expect(fetch).toHaveBeenCalledWith(
      '/sitemap.xml',
      expect.objectContaining({ cache: 'no-store' }),
    );
    expect(fixture.nativeElement.querySelector('pre')?.textContent).toContain('<urlset>');
    expect(fixture.nativeElement.querySelector('urlset')).toBeNull();
    expect(fixture.nativeElement.querySelector('[target="_blank"]')).toBeNull();
    expect(fixture.componentInstance.discovery()?.name).toBe('sitemap.xml');
  } finally {
    fetch.mockRestore();
  }
});
