export interface CalendarEvent {
  _id: string;
  title: string;
  kind: 'music' | 'karaoke' | 'sports' | 'other';
  description: string;
  image: string;
  starts: string | null;
  ends: string | null;
  location: string;
  admission: string;
  active: boolean;
  isSample: boolean;
}
