import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';
import { vi } from 'vitest';
import { Api } from './api';
import { SeoService } from './seo.service';
import type { SeoMetadata } from './interfaces';

const metadata = (): SeoMetadata => ({
  title: 'Search title',
  description: 'Search description',
  shareTitle: 'Shared title',
  shareDescription: 'Shared description',
  image: 'https://image.example/share.png',
  siteName: 'Configured business',
  locale: 'es_CR',
  canonical: location.origin + '/',
  indexable: true,
});
describe('Route SEO', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideRouter([])] }));
  afterEach(() => {
    document
      .querySelectorAll(
        'meta[property^="og:"], meta[name^="twitter:"], meta[name="taurus-seo-path"], link[rel="canonical"], meta[name="description"], meta[name="robots"]',
      )
      .forEach((element) => element.remove());
    TestBed.resetTestingModule();
  });
  it('uses the saved metadata and removes private route metadata without another public read', async () => {
    const request = vi.spyOn(TestBed.inject(Api), 'request').mockResolvedValue(metadata());
    const service = TestBed.inject(SeoService);
    await service.navigate('/?mesa=private');
    expect(TestBed.inject(Title).getTitle()).toBe('Search title');
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe(
      location.origin + '/',
    );
    expect(TestBed.inject(Meta).getTag('property="og:title"')?.content).toBe('Shared title');
    await service.navigate('/#carta');
    expect(request).toHaveBeenCalledTimes(1);
    await service.navigate('/admin/seo');
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('noindex, nofollow');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
    expect(TestBed.inject(Meta).getTag('property="og:title"')).toBeNull();
    expect(request).toHaveBeenCalledTimes(1);
  });
  it('reuses server-rendered initial metadata instead of querying again', async () => {
    const request = vi.spyOn(TestBed.inject(Api), 'request');
    TestBed.inject(Meta).updateTag({ name: 'taurus-seo-path', content: '/' });
    TestBed.inject(Title).setTitle('Server title');
    await TestBed.inject(SeoService).navigate('/');
    expect(request).not.toHaveBeenCalled();
    expect(TestBed.inject(Title).getTitle()).toBe('Server title');
  });
  it('an obsolete public request cannot overwrite a private route', async () => {
    let resolve!: (data: SeoMetadata) => void;
    vi.spyOn(TestBed.inject(Api), 'request').mockImplementation(
      () =>
        new Promise((done) => {
          resolve = done as (data: SeoMetadata) => void;
        }),
    );
    const service = TestBed.inject(SeoService);
    const pending = service.navigate('/');
    await service.navigate('/cuenta');
    resolve(metadata());
    await pending;
    expect(TestBed.inject(Meta).getTag('name="robots"')?.content).toBe('noindex, nofollow');
    expect(document.querySelector('link[rel="canonical"]')).toBeNull();
  });
});
