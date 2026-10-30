import { Component, computed, inject, signal, effect } from '@angular/core';
import {
  ActivatedRoute,
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { filter, map, startWith } from 'rxjs';
import { Api } from '../api';
import { Icon } from '../icon';
import { navigationFor } from '../admin-navigation';
import { OrderActivity } from './order-activity';

@Component({
  selector: 'app-admin-shell',
  imports: [RouterLink, RouterLinkActive, RouterOutlet, Icon],
  providers: [OrderActivity],
  templateUrl: './admin-shell.html',
  styleUrl: './admin-shell.css',
})
export class AdminShell {
  readonly api = inject(Api);
  readonly activity = inject(OrderActivity);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  readonly sidebarExpanded = signal(false);
  readonly loggingOut = signal(false);
  readonly navigation = computed(() => navigationFor(this.api.role()));
  readonly roleName = computed(
    () =>
      ({ admin: 'Administrador', kitchen: 'Cocina', waiter: 'Mesero' })[this.api.role() ?? 'admin'],
  );
  readonly low = computed(
    () =>
      this.api
        .state()
        ?.products.filter((p) => p.active && p.inventory !== 'none' && p.stock <= p.minimum) ?? [],
  );
  readonly sectionLabel = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map(() => this.route.firstChild?.snapshot?.data?.['label'] as string | undefined),
      startWith(this.route.firstChild?.snapshot?.data?.['label'] as string | undefined),
    ),
  );
  constructor() {
    effect(() => {
      if (!this.api.authenticated() && !this.router.currentNavigation()) {
        this.activity.stopWatching();
        void this.router.navigateByUrl('/admin/login', { replaceUrl: true });
      }
    });
  }
  closeOnMobile() {
    if (window.matchMedia?.('(max-width: 900px)').matches) this.sidebarExpanded.set(false);
  }
  async logout() {
    if (this.loggingOut()) return;
    this.loggingOut.set(true);
    try {
      await this.api.logout();
      this.activity.stopWatching();
      await this.router.navigateByUrl('/admin/login', { replaceUrl: true });
    } catch (error) {
      this.activity.error.set(
        error instanceof Error ? error.message : 'No se pudo cerrar la sesión.',
      );
    } finally {
      this.loggingOut.set(false);
    }
  }
}
