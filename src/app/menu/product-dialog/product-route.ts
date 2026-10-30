import { DOCUMENT, Location } from '@angular/common';
import {
  afterNextRender,
  AnimationCallbackEvent,
  Component,
  DestroyRef,
  inject,
  Signal,
  viewChild,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, ROUTER_OUTLET_DATA, Router } from '@angular/router';
import { Settings } from '../../api';
import { isServing, MenuSelection } from '../menu.models';
import { ProductDialogComponent } from './product-dialog.component';

export interface ProductOutletContext {
  settings: Settings;
  canOrder?: boolean;
  submitting?: boolean;
  addToOrder?: (selection: MenuSelection) => void;
}

@Component({
  selector: 'app-product-route',
  imports: [ProductDialogComponent],
  host: { 'animate.enter': 'product-route-enter', '(animate.leave)': 'leave($event)' },
  template: `<app-product-dialog
    [settings]="context().settings"
    [canOrder]="context().canOrder ?? false"
    [submitting]="context().submitting ?? false"
    [routed]="true"
    (closed)="close()"
    (productAdded)="add($event)"
  />`,
})
export class ProductRoute {
  readonly context = inject(ROUTER_OUTLET_DATA) as Signal<ProductOutletContext>;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly dialog = viewChild.required(ProductDialogComponent);
  private readonly opener = inject(DOCUMENT).activeElement;
  private readonly openedFromMenu =
    this.router.navigated &&
    this.router.currentNavigation()?.extras.state?.['productModal'] === true;
  private closing = false;

  constructor() {
    afterNextRender(() => {
      this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
        const serving = this.route.snapshot.queryParamMap.get('presentacion') ?? '';
        this.dialog().openById(params.get('productId')!, isServing(serving) ? serving : 'shot');
      });
    });
  }

  add(selection: MenuSelection) {
    this.context().addToOrder?.(selection);
  }

  close() {
    if (this.closing || this.destroyRef.destroyed) return;
    this.closing = true;
    if (this.openedFromMenu) this.location.back();
    else
      void this.router.navigate(['.'], {
        relativeTo: this.route.parent,
        queryParamsHandling: 'merge',
        queryParams: { presentacion: null },
        replaceUrl: true,
      });
  }

  leave(event: AnimationCallbackEvent) {
    const dialog = (event.target as HTMLElement).querySelector('dialog');
    const finish = () => {
      if (dialog?.open) dialog.close();
      event.animationComplete();
      if (this.opener instanceof HTMLElement && this.opener.isConnected)
        this.opener.focus({ preventScroll: true });
    };
    if (
      !dialog ||
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ||
      typeof dialog.animate !== 'function'
    ) {
      finish();
      return;
    }
    try {
      const animation = dialog.animate(
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'translateY(10px) scale(.985)' },
        ],
        { duration: 160, easing: 'ease-in', fill: 'forwards' },
      );
      void animation.finished.then(finish, finish);
    } catch {
      finish();
    }
  }
}
