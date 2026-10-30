import { Component, inject, input } from '@angular/core';
import { CalendarEvent, Settings } from '../api';
import { Icon } from '../icon';
import { IconName } from '../icon-names';
import { ScrollReveal } from '../scroll-reveal';
@Component({
  selector: 'app-public-events',
  imports: [Icon],
  providers: [ScrollReveal],
  templateUrl: './events.html',
  styles: ':host {display:block}',
})
export class PublicEvents {
  readonly settings = input.required<Settings>();
  readonly events = input<readonly CalendarEvent[]>([]);
  readonly reveal = inject(ScrollReveal);
  readonly eventIcon = (kind: CalendarEvent['kind']): IconName =>
    (({ music: 'music', karaoke: 'mic-vocal', sports: 'tv', other: 'calendar-days' }) as const)[
      kind
    ];
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
    const phone = this.settings()
      .phone?.split('/')[0]
      .replace(/[^\d+]/g, '');
    return phone ? 'tel:' + phone : '/#visitanos';
  }
}
