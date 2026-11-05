import { Component, input } from '@angular/core';
@Component({
  selector: 'app-panel',
  host: { class: 'block overflow-hidden rounded-xl border border-border bg-surface' },
  templateUrl: './panel.html',
})
export class Panel {
  public readonly title = input('');
}
