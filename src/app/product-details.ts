import { Component, input, output, viewChild, ElementRef, afterNextRender } from '@angular/core';
import { Product, categoryName, Api } from './api';
import { inject } from '@angular/core';
@Component({
  selector: 'app-product-details',
  template: ` <dialog
    #dialog
    class="product-details"
    aria-labelledby="product-detail-title"
    (cancel)="dismissed.emit()"
    (close)="dismissed.emit()"
    (click)="backdrop($event)"
  >
    <button
      class="button outline detail-close"
      type="button"
      (click)="dismissed.emit()"
      aria-label="Cerrar detalles"
    >
      Cerrar ×
    </button>
    @if (product().image) {
      <img class="detail-image" [src]="product().image" [alt]="product().name" />
    }
    <div class="p-6">
      <p class="eyebrow">
        {{ categoryName(product().category) }}
        @if (product().drinkType) {
          · {{ product().drinkType === 'alcoholic' ? 'Con alcohol' : 'Libre de alcohol' }}
        }
      </p>
      <h2 id="product-detail-title">{{ product().name }}</h2>
      <p class="detail-description">
        {{
          product().description ||
            'Consultá al personal para conocer más detalles de este producto.'
        }}
      </p>
      @if (product().inventory === 'ml') {
        @for (size of sizes; track size.key) {
          <p>{{ size.name }} · {{ api.money(product().prices[size.key], currency()) }}</p>
        }
      } @else {
        <strong>{{ api.money(product().price, currency()) }}</strong>
      }
    </div>
  </dialog>`,
})
export class ProductDetails {
  readonly product = input.required<Product>();
  readonly currency = input.required<string>();
  readonly dismissed = output<void>();
  readonly api = inject(Api);
  readonly categoryName = categoryName;
  readonly sizes = [
    { key: 'shot', name: 'Shot' },
    { key: 'small', name: 'Pequeño' },
    { key: 'large', name: 'Grande' },
  ] as const;
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  constructor() {
    afterNextRender(() => this.dialog().nativeElement.showModal());
  }
  backdrop(event: MouseEvent) {
    if (event.target === this.dialog().nativeElement) {
      const rect = this.dialog().nativeElement.getBoundingClientRect();
      if (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
      )
        this.dismissed.emit();
    }
  }
}
