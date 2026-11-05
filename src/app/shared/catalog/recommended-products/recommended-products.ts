import { Component, inject, input } from '@angular/core';
import { Router } from '@angular/router';
import type { MenuItem, MenuSelection, Settings } from '../../../interfaces';
import { ProductCardComponent } from '../../../menu/product-card';
@Component({
  selector: 'app-recommended-products',
  imports: [ProductCardComponent],
  host: { class: 'block' },
  templateUrl: './recommended-products.html',
})
export class RecommendedProducts {
  private readonly router = inject(Router);
  public readonly products = input.required<readonly MenuItem[]>();
  public readonly settings = input.required<Settings>();
  public open(selection: MenuSelection): void {
    this.router.navigate(['/producto', selection.product._id], {
      queryParams: selection.serving === 'unit' ? {} : { presentacion: selection.serving },
    });
  }
}
