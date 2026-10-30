import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-section-skeleton',
  template: `<section
    class="page-width deferred-skeleton"
    role="status"
    [attr.aria-label]="label()"
    aria-busy="true"
  >
    <div class="skeleton-heading"></div>
    <div class="skeleton-cards">
      @for (card of placeholders(); track card) {
        <article><span></span><span></span><span></span></article>
      }
    </div>
  </section>`,
  styleUrl: './section-skeleton.css',
})
export class SectionSkeleton {
  readonly label = input('Cargando sección');
  readonly count = input(3);
  readonly placeholders = computed(() => Array.from({ length: this.count() }, (_, index) => index));
}
