import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Meta, Title } from '@angular/platform-browser';
import { NavigationEnd, Router } from '@angular/router';
import { Api } from './api';
import type { SeoMetadata } from './interfaces';

@Injectable({ providedIn: 'root' })
export class SeoService {
  private readonly api = inject(Api);
  private readonly router = inject(Router);
  private readonly meta = inject(Meta);
  private readonly title = inject(Title);
  private readonly document = inject(DOCUMENT);
  private readonly destroy = inject(DestroyRef);
  private controller?: AbortController;
  private initial = true;
  private currentPath?: string;
  public start(): void {
    this.router.events.pipe(takeUntilDestroyed(this.destroy)).subscribe((event) => {
      if (event instanceof NavigationEnd) this.navigate(event.urlAfterRedirects);
    });
    this.destroy.onDestroy(() => this.controller?.abort());
  }
  public async navigate(url: string): Promise<void> {
    const path = url.split(/[?#]/)[0] || '/';
    if (path === this.currentPath) return;
    this.currentPath = path;
    this.controller?.abort();
    const publicPage = path === '/' || /^\/producto\/[a-f\d]{24}$/.test(path);
    const serverPath = this.document
      .querySelector('meta[name="taurus-seo-path"]')
      ?.getAttribute('content');
    const rendered = this.initial && serverPath === path;
    this.initial = false;
    if (!publicPage) {
      this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
      this.meta.updateTag({ name: 'description', content: '' });
      this.document.querySelector('link[rel="canonical"]')?.remove();
      this.document
        .querySelectorAll(
          'meta[property^="og:"], meta[name^="twitter:"], meta[name="taurus-seo-path"]',
        )
        .forEach((element) => element.remove());
      return;
    }
    // Initial HTML already contains metadata: avoid another startup database read.
    if (rendered) return;
    const controller = new AbortController();
    this.controller = controller;
    try {
      const data = await this.api.request<SeoMetadata>(
        '/seo?path=' + encodeURIComponent(path),
        'GET',
        undefined,
        { signal: controller.signal },
      );
      if (!controller.signal.aborted) this.apply(data);
    } catch {
      if (!controller.signal.aborted)
        this.meta.updateTag({ name: 'robots', content: 'noindex, nofollow' });
    }
  }
  public apply(data: SeoMetadata): void {
    const canonical = new URL(data.canonical);
    if (canonical.origin !== this.document.location.origin) return;
    this.title.setTitle(data.title);
    for (const [name, content] of Object.entries({
      description: data.description,
      robots: data.indexable ? 'index, follow' : 'noindex, nofollow',
      'twitter:card': data.image ? 'summary_large_image' : 'summary',
      'twitter:title': data.shareTitle,
      'twitter:description': data.shareDescription,
    }))
      this.meta.updateTag({ name, content });
    for (const [property, content] of Object.entries({
      'og:type': 'website',
      'og:title': data.shareTitle,
      'og:description': data.shareDescription,
      'og:url': data.canonical,
      'og:site_name': data.siteName,
      'og:locale': data.locale,
    }))
      this.meta.updateTag({ property, content });
    if (data.image) {
      this.meta.updateTag({ property: 'og:image', content: data.image });
      this.meta.updateTag({ name: 'twitter:image', content: data.image });
    } else {
      this.meta.removeTag('property="og:image"');
      this.meta.removeTag('name="twitter:image"');
    }
    let link = this.document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!link) {
      link = this.document.createElement('link');
      link.rel = 'canonical';
      this.document.head.appendChild(link);
    }
    link.href = canonical.href;
  }
}
