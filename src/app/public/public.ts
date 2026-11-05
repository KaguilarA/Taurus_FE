import { Component, inject, signal } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Api, themeAccent } from '../api';
import { Icon } from '../icon';
import type { PublicState } from '../interfaces';
import { PublicEvents } from '../landing/events';
import { PublicPromotions } from '../landing/promotions';
import { MenuComponent } from '../menu';
import { RecommendedProducts } from '../shared/catalog';
import { DeferredError } from '../shared/deferred-error';
import { SectionSkeleton } from '../shared/section-skeleton';
import { Button } from '../shared/ui';
import { Dialog } from '../shared/ui/dialog';
import { PageSkeleton } from '../shared/ui/page-skeleton';
@Component({
  selector: 'app-public',
  imports: [
    Dialog,
    RecommendedProducts,
    Button,
    RouterLink,
    RouterOutlet,
    Icon,
    MenuComponent,
    PageSkeleton,
    PublicEvents,
    PublicPromotions,
    SectionSkeleton,
    DeferredError,
  ],
  templateUrl: './public.html',
})
export class PublicPage {
  private readonly api = inject(Api);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  public readonly data = signal<PublicState | null>(null);
  public readonly error = signal('');
  public readonly navigationOpen = signal(false);
  public sectionLink(section: string): string {
    return '/#' + section;
  }
  constructor() {
    this.load();
  }
  public async load(): Promise<void> {
    this.error.set('');
    try {
      const data = await this.api.request<PublicState>('/public');
      data.settings.accent = themeAccent(data.settings.accent);
      this.data.set(data);
      this.api.productTypes.set(data.productTypes ?? []);
      this.title.setTitle(
        `${data.settings.name}${data.settings.subtitle ? ' · ' + data.settings.subtitle : ''}`,
      );
      this.meta.updateTag({ name: 'description', content: data.settings.description });
    } catch (error) {
      this.error.set((error as Error).message);
    }
  }
}
