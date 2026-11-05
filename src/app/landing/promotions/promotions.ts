import { Component, inject, input } from '@angular/core';
import { Icon } from '../../icon';
import type { Promotion } from '../../interfaces';
import { ScrollReveal } from '../../scroll-reveal';
@Component({
  host: { class: 'block' },
  selector: 'app-public-promotions',
  imports: [Icon],
  providers: [ScrollReveal],
  templateUrl: './promotions.html',
})
export class PublicPromotions {
  protected readonly reveal = inject(ScrollReveal);
  public readonly promotions = input<readonly Promotion[]>([]);
}
