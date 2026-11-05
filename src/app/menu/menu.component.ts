import { ChangeDetectionStrategy } from '@angular/core';
import { Component, ElementRef, inject, input, OnInit, output, viewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Icon } from '../icon';
import type { MenuPage, MenuSelection, Settings } from '../interfaces';
import { ScrollReveal } from '../scroll-reveal';
import { CatalogFilters, Pagination } from '../shared/catalog';
import { Button } from '../shared/ui';
import { DRINK_FILTERS, MENU_CATEGORIES } from './menu.models';
import { MenuStore } from './menu.store';
import { ProductCardComponent } from './product-card';
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'block' },
  selector: 'app-menu',
  imports: [CatalogFilters, Pagination, Button, Icon, ProductCardComponent],
  providers: [MenuStore, ScrollReveal],
  templateUrl: './menu.component.html',
})
export class MenuComponent implements OnInit {
  protected readonly store = inject(MenuStore);
  protected readonly reveal = inject(ScrollReveal);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  public readonly settings = input.required<Settings>();
  public readonly initialPage = input<MenuPage>();
  public readonly canOrder = input(false);
  public readonly submitting = input(false);
  public readonly productAdded = output<MenuSelection>();
  public readonly categories = MENU_CATEGORIES;
  public readonly drinkFilters = DRINK_FILTERS;
  public readonly placeholders = [0, 1, 2, 3, 4, 5];
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  public ngOnInit(): void {
    this.store.initialize(this.initialPage());
  }
  public searchChanged(event: Event): void {
    if (event.target instanceof HTMLInputElement) this.store.setSearch(event.target.value);
  }
  public openDetails(selection: MenuSelection): void {
    this.router.navigate(['producto', selection.product._id], {
      relativeTo: this.route,
      queryParamsHandling: 'merge',
      queryParams: { presentacion: selection.serving === 'unit' ? null : selection.serving },
      state: { productModal: true },
    });
  }
  public changePage(page: number): void {
    this.store.goToPage(page);
    this.heading().nativeElement.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }
}
