import { PublicEvents } from './landing/events';
import { PublicPromotions } from './landing/promotions';
import { SectionSkeleton } from './shared/section-skeleton';
import { DeferredError } from './shared/deferred-error';
import { MenuComponent } from './menu/menu.component';
import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { Icon } from './icon';
import { Api, PublicState, themeAccent } from './api';
import { PageSkeleton } from './page-skeleton';
@Component({
  selector: 'app-public',
  imports: [
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
  styleUrl: './public.css',
})
export class PublicPage {
  readonly api = inject(Api);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  readonly data = signal<PublicState | null>(null);
  readonly error = signal('');
  sectionLink(section: string) {
    return '/#' + section;
  }
  constructor() {
    void this.load();
  }
  async load() {
    this.error.set('');
    try {
      const data = await this.api.request<PublicState>('/public');
      data.settings.accent = themeAccent(data.settings.accent);
      this.data.set(data);
      this.title.setTitle(
        `${data.settings.name}${data.settings.subtitle ? ' · ' + data.settings.subtitle : ''}`,
      );
      this.meta.updateTag({ name: 'description', content: data.settings.description });
    } catch (error) {
      this.error.set((error as Error).message);
    }
  }
}
