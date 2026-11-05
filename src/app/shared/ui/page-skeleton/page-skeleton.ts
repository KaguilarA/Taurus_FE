import { Component, computed, input } from '@angular/core';

@Component({
  selector: 'app-page-skeleton',
  host: { class: 'block' },
  templateUrl: './page-skeleton.html',
})
export class PageSkeleton {
  public readonly variant = input<'landing' | 'account' | 'admin' | 'section'>('landing');
  public readonly count = input(6);
  public readonly cards = computed(() =>
    Array.from({ length: this.count() }, (_, i) => i)
  );
}
