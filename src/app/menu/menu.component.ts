import { Component, ElementRef, inject, input, OnInit, output, viewChild } from '@angular/core';
import type { Settings } from '../api';
import { Icon } from '../icon';
import { ScrollReveal } from '../scroll-reveal';
import { MenuStore } from './menu.store';
import { DRINK_FILTERS, MENU_CATEGORIES, type MenuPage, type MenuSelection } from './menu.models';
import { ProductCardComponent } from './product-card/product-card.component';
import { ProductDialogComponent } from './product-dialog/product-dialog.component';
@Component({
  selector: 'app-menu',
  imports: [Icon, ProductCardComponent, ProductDialogComponent],
  providers: [MenuStore, ScrollReveal],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css',
})
export class MenuComponent implements OnInit {
  readonly settings = input.required<Settings>();
  readonly initialPage = input<MenuPage>();
  readonly canOrder = input(false);
  readonly submitting = input(false);
  readonly productAdded = output<MenuSelection>();
  readonly store = inject(MenuStore);
  readonly reveal = inject(ScrollReveal);
  readonly categories = MENU_CATEGORIES;
  readonly drinkFilters = DRINK_FILTERS;
  readonly placeholders = [0, 1, 2, 3, 4, 5];
  private readonly dialog = viewChild.required(ProductDialogComponent);
  private readonly heading = viewChild.required<ElementRef<HTMLElement>>('heading');
  ngOnInit() {
    this.store.initialize(this.initialPage());
  }
  searchChanged(event: Event) {
    if (event.target instanceof HTMLInputElement) this.store.setSearch(event.target.value);
  }
  openDetails(selection: MenuSelection) {
    this.dialog().open(selection);
  }
  changePage(page: number) {
    this.store.goToPage(page);
    this.heading().nativeElement.scrollIntoView({
      block: 'start',
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'instant'
        : 'smooth',
    });
  }
}
