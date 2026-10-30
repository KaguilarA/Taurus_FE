import { Component, inject, input } from '@angular/core';
import { Promotion } from '../api';
import { Icon } from '../icon';
import { ScrollReveal } from '../scroll-reveal';
@Component({
  selector: 'app-public-promotions',
  imports: [Icon],
  providers: [ScrollReveal],
  templateUrl: './promotions.html',
  styles: ':host {display:block}',
})
export class PublicPromotions {
  readonly promotions = input<readonly Promotion[]>([]);
  readonly reveal = inject(ScrollReveal);
}
