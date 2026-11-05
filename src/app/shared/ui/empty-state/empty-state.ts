import { Component, input } from '@angular/core';
@Component({
  selector: 'app-empty-state',
  host: { class: 'block px-6 py-12 text-center text-sm leading-8 text-muted' },
  templateUrl: './empty-state.html',
})
export class EmptyState {
  public readonly message = input.required<string>();
}
