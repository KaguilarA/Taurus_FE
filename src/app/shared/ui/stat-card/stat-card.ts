import { Component, input } from '@angular/core';
@Component({
  selector: 'app-stat-card',
  host: { class: 'block h-full' },
  templateUrl: './stat-card.html',
})
export class StatCard {
  public readonly label = input.required<string>();
  public readonly value = input.required<string | number>();
  public readonly description = input('');
  public readonly attention = input(false);
}
