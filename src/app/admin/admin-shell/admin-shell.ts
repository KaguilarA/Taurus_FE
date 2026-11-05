import { Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterOutlet } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { navigationFor } from '../../admin-navigation';
import { Api } from '../../api';
import { Icon } from '../../icon';
import { Feedback } from '../../shared/ui';
import { OrderActivity } from '../order-activity';
import { AdminSidebar } from '../shared';
@Component({
  selector: 'app-admin-shell',
  imports: [AdminSidebar, Feedback, RouterLink, RouterOutlet, Icon],
  providers: [OrderActivity],
  templateUrl: './admin-shell.html',
})
export class AdminShell {
  protected readonly api = inject(Api);
  protected readonly activity = inject(OrderActivity);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  public readonly sidebarExpanded = signal(false);
  public readonly loggingOut = signal(false);
  public readonly navigation = computed(() => navigationFor(this.api.role()));
  public readonly roleName = computed(
    () =>
      ({ admin: 'Administrador', kitchen: 'Cocina', waiter: 'Mesero' })[this.api.role() ?? 'admin'],
  );
  public readonly low = computed(
    () =>
      this.api
        .state()
        ?.products.filter((p) => p.active && p.inventory !== 'none' && p.stock <= p.minimum) ?? [],
  );
  public readonly sectionLabel = toSignal(
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
        this.router.navigateByUrl('/admin/login', { replaceUrl: true });
      }
    });
  }
  public closeOnMobile(): void {
    if (window.matchMedia?.('(max-width: 1023px)').matches) this.sidebarExpanded.set(false);
  }
  public async logout(): Promise<void> {
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
