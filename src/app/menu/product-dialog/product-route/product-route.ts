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
import { ActivatedRoute, Router, ROUTER_OUTLET_DATA } from '@angular/router';
import { ProductDialogComponent } from '..';
import type { MenuSelection, ProductOutletContext } from '../../../interfaces';
import { isServing } from '../../menu.models';
@Component({
  selector: 'app-product-route',
  imports: [ProductDialogComponent],
  host: {
    class:
      'block fixed top-0 right-0 bottom-0 left-0 pointer-events-none [&_dialog.product-dialog]:pointer-events-auto',
    'animate.enter':
      'product-route-enter animate-[product-route-hold_200ms_linear] [&_dialog[open]]:animate-[product-route-in_200ms_cubic-bezier(0.2,_0.7,_0.2,_1)_both] [@media(prefers-reduced-motion:_reduce)]:animate-none [@media(prefers-reduced-motion:_reduce)]:[&_dialog[open]]:animate-none',
    '(animate.leave)': 'leave($event)',
  },
  templateUrl: './product-route.html',
})
export class ProductRoute {
  protected readonly context = inject(ROUTER_OUTLET_DATA) as Signal<ProductOutletContext>;
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly destroyRef = inject(DestroyRef);
  private readonly opener = inject(DOCUMENT).activeElement;
  private readonly dialog = viewChild.required(ProductDialogComponent);
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
  public add(selection: MenuSelection): void {
    this.context().addToOrder?.(selection);
  }
  public close(): void {
    if (this.closing || this.destroyRef.destroyed) return;
    this.closing = true;
    if (this.openedFromMenu) this.location.back();
    else
      this.router.navigate(['.'], {
        relativeTo: this.route.parent,
        queryParamsHandling: 'merge',
        queryParams: { presentacion: null },
        replaceUrl: true,
      });
  }
  public leave(event: AnimationCallbackEvent): void {
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
      animation.finished.then(finish, finish);
    } catch {
      finish();
    }
  }
}
