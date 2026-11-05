import { Component, input } from '@angular/core';
import { PageSkeleton } from '../ui/page-skeleton';

@Component({
  selector: 'app-section-skeleton',
  imports: [PageSkeleton],
  host: { class: 'block scroll-mt-6' },
  templateUrl: './section-skeleton.html',
})
export class SectionSkeleton {
  public readonly label = input('Cargando sección');
  public readonly count = input(3);
}
