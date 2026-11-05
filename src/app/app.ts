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
import { Feedback, PageSkeleton } from './shared/ui';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, PageSkeleton, Feedback],
  templateUrl: './app.html',
})
export class App {
  protected readonly router = inject(Router);
  public readonly navigating = signal(true);
  public readonly initial = signal(true);
  public readonly navigationError = signal('');
  public readonly destination = signal(location.pathname);

  constructor() {
    this.router.events.pipe(takeUntilDestroyed()).subscribe((event) => {
      if (event instanceof NavigationStart) {
        this.destination.set(event.url);
        this.navigating.set(true);
        this.navigationError.set('');
      }

      if (event instanceof NavigationEnd) this.initial.set(false);

      if (event instanceof NavigationError)
        this.navigationError.set(
          'No pudimos abrir la página. Revisá tu conexión y volvé a intentar.',
        );

      if (
        event instanceof NavigationEnd ||
        event instanceof NavigationCancel ||
        event instanceof NavigationError
      )
        this.navigating.set(false);
    });
  }
}
