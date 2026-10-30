import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-skeleton',
  template: `
    <div
      class="page-skeleton"
      [class.admin-skeleton]="variant() === 'admin'"
      [class.section-skeleton]="variant() === 'section'"
      aria-busy="true"
      role="status"
      aria-label="Cargando contenido"
    >
      @if (variant() === 'admin') {
        <aside aria-hidden="true">
          <span></span>
          @for (row of rows; track row) {
            <i></i>
          }
        </aside>
      }
      <div class="skeleton-content" aria-hidden="true">
        <header><span class="skeleton-brand"></span><span class="skeleton-nav"></span></header>
        <section [class.skeleton-hero]="variant() === 'landing'">
          <span class="skeleton-eyebrow"></span><span class="skeleton-title"></span
          ><span class="skeleton-line"></span><span class="skeleton-line short"></span
          ><span class="skeleton-button"></span>
        </section>
        <div class="skeleton-grid">
          @for (card of cards; track card) {
            <article>
              <span class="skeleton-eyebrow"></span><span class="skeleton-line"></span
              ><span class="skeleton-line short"></span>
            </article>
          }
        </div>
      </div>
    </div>
  `,
  styleUrl: './page-skeleton.css',
})
export class PageSkeleton {
  readonly variant = input<'landing' | 'account' | 'admin' | 'section'>('landing');
  readonly rows = [0, 1, 2, 3, 4, 5];
  readonly cards = [0, 1, 2, 3, 4, 5];
}
