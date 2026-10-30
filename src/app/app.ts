import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  NavigationCancel,
  NavigationEnd,
  NavigationError,
  NavigationStart,
  Router,
  RouterOutlet,
} from '@angular/router';
import { PageSkeleton } from './page-skeleton';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PageSkeleton],
  template: `@if (navigating()) {
      <app-page-skeleton
        [variant]="
          destination().startsWith('/admin')
            ? 'admin'
            : destination().startsWith('/cuenta')
              ? 'account'
              : 'landing'
        "
      />
    }
    <div [hidden]="navigating()"><router-outlet /></div>`,
})
export class App {
  readonly navigating = signal(true);
  readonly destination = signal(location.pathname);
  constructor() {
    const router = inject(Router);
    router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.destination.set(event.url);
        this.navigating.set(!router.navigated);
      }
      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      )
        this.navigating.set(false);
    });
  }
}
