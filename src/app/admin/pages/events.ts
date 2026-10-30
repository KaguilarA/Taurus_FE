import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { CalendarEvent } from '../../api';
import { Icon } from '../../icon';
import { ImageUpload } from '../../image-upload';
import { PageSkeleton } from '../../page-skeleton';
import { AdminPageHeading } from '../shared/page-heading';
import { AdminTask } from '../shared/admin-task';

@Component({
  selector: 'app-admin-events',
  imports: [AdminPageHeading, PageSkeleton, FormsModule, DatePipe, Icon, ImageUpload],
  templateUrl: './events.html',
})
export class EventsPage extends AdminTask {
  event: CalendarEvent | null = null;
  editEvent(event?: CalendarEvent) {
    const local = (value: string | null) => {
      if (!value) return '';
      const date = new Date(value);
      return new Date(+date - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    this.event = event
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
        };
  }
  saveEvent() {
    const event = this.event!;
    void this.run(async () => {
      await this.api.request(
        '/admin/events' + (event._id ? '/' + event._id : ''),
        event._id ? 'PUT' : 'POST',
        {
          ...event,
          starts: event.starts ? new Date(event.starts).toISOString() : null,
          ends: event.ends ? new Date(event.ends).toISOString() : null,
        },
      );
      this.event = null;
      await this.api.load();
    }, 'Evento guardado. Los eventos activos aparecen en la agenda pública.');
  }
}
