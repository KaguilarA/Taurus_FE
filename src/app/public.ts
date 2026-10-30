import { MenuComponent } from './menu/menu.component';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { Icon } from './icon';
import { Api, PublicState, CalendarEvent, themeAccent } from './api';
import { IconName } from './icon-names';
import { ScrollReveal } from './scroll-reveal';
import { PageSkeleton } from './page-skeleton';
@Component({
  selector: 'app-public',
  imports: [RouterLink, Icon, MenuComponent, PageSkeleton],
  providers: [ScrollReveal],
  templateUrl: './public.html',
  styleUrl: './public.css',
})
export class PublicPage {
  readonly reveal = inject(ScrollReveal);
  readonly api = inject(Api);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);
  readonly data = signal<PublicState | null>(null);
  readonly error = signal('');
  readonly eventIcon = (kind: CalendarEvent['kind']): IconName =>
    ({ music: 'music', karaoke: 'mic-vocal', sports: 'tv', other: 'calendar-days' })[
      kind
    ] as IconName;
  eventWhen(event: CalendarEvent) {
    return event.starts
      ? new Intl.DateTimeFormat('es-CR', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'America/Costa_Rica',
        }).format(new Date(event.starts))
      : 'Fecha por confirmar';
  }
  contactLink() {
    const phone = this.data()
      ?.settings.phone?.split('/')[0]
      .replace(/[^\d+]/g, '');
    return phone ? 'tel:' + phone : this.sectionLink('visitanos');
  }
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
