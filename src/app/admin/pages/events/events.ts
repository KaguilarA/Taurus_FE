import { DatePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../../icon';
import { ImageUpload } from '../../../image-upload';
import type { CalendarEvent } from '../../../interfaces';
import { Button, Dialog, Feedback } from '../../../shared/ui';
import { PageSkeleton } from '../../../shared/ui/page-skeleton';
import { updateField } from '../../../shared/update-field';
import { AdminTask } from '../../shared/admin-task';
import { AdminPageHeading } from '../../shared/page-heading';
@Component({
  selector: 'app-admin-events',
  imports: [
    Dialog,
    Button,
    Feedback,
    AdminPageHeading,
    PageSkeleton,
    FormsModule,
    DatePipe,
    Icon,
    ImageUpload,
  ],
  templateUrl: './events.html',
})
export class EventsPage extends AdminTask {
  public readonly updateField = updateField;
  public readonly event = signal<CalendarEvent | null>(null);
  public editEvent(event?: CalendarEvent): void {
    const local = (value: string | null) => {
      if (!value) return '';
      const date = new Date(value);
      return new Date(+date - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    this.event.set(
      event
        ? { ...structuredClone(event), starts: local(event.starts), ends: local(event.ends) }
        : {
            _id: '',
            title: '',
            kind: 'music',
            description: '',
            image: '',
            starts: '',
            ends: '',
            location: this.api.state()?.settings.address ?? '',
            admission: '',
            active: true,
            isSample: false,
          },
    );
  }
  public saveEvent(): void {
    const event = this.event()!;
    this.run(async () => {
      await this.api.request(
        '/admin/events' + (event._id ? '/' + event._id : ''),
        event._id ? 'PUT' : 'POST',
        {
          ...event,
          starts: event.starts ? new Date(event.starts).toISOString() : null,
          ends: event.ends ? new Date(event.ends).toISOString() : null,
        },
      );
      this.event.set(null);
      await this.api.load();
    }, 'Evento guardado. Los eventos activos aparecen en la agenda pública.');
  }
}
