import { Component, inject, input } from '@angular/core';
import { Icon } from '../../icon';
import type { CalendarEvent, IconName, Settings } from '../../interfaces';
import { ScrollReveal } from '../../scroll-reveal';
import { Button } from '../../shared/ui';
@Component({
  host: { class: 'block' },
  selector: 'app-public-events',
  imports: [Button, Icon],
  providers: [ScrollReveal],
  templateUrl: './events.html',
})
export class PublicEvents {
  protected readonly reveal = inject(ScrollReveal);
  public readonly settings = input.required<Settings>();
  public readonly events = input<readonly CalendarEvent[]>([]);
  public readonly eventIcon = (kind: CalendarEvent['kind']): IconName =>
    (({ music: 'music', karaoke: 'mic-vocal', sports: 'tv', other: 'calendar-days' }) as const)[
      kind
    ];
  public eventWhen(event: CalendarEvent): string {
    return event.starts
      ? new Intl.DateTimeFormat('es-CR', {
          dateStyle: 'long',
          timeStyle: 'short',
          timeZone: 'America/Costa_Rica',
        }).format(new Date(event.starts))
      : 'Fecha por confirmar';
  }
  public contactLink(): string {
    const phone = this.settings()
      .phone?.split('/')[0]
      .replace(/[^\d+]/g, '');
    return phone ? 'tel:' + phone : '/#visitanos';
  }
}
