import { ChangeDetectionStrategy } from '@angular/core';
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
import { reportConnection } from './connection-diagnostics';
import { Api } from './api';
import { Feedback } from './shared/ui/feedback';
import { PageSkeleton } from './shared/ui/page-skeleton';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-root',
  imports: [RouterOutlet, PageSkeleton, Feedback],
  templateUrl: './app.html',
})
export class App {
  public readonly api = inject(Api);
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

      if (event instanceof NavigationEnd) {
        this.initial.set(false);
        reportConnection('READY');
      }

      if (event instanceof NavigationError) {
        const moduleFailure = /dynamically imported module|loading chunk|importing a module/i.test(
          String(event.error?.message ?? ''),
        );
        reportConnection(moduleFailure ? 'MODULE_DOWNLOAD' : 'BOOT_ERROR');
        this.navigationError.set(
          'No pudimos abrir la página. Revisá tu conexión y volvé a intentar.',
        );
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
