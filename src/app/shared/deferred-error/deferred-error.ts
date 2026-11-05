import { DOCUMENT } from '@angular/common';
import { Component, inject, input } from '@angular/core';
import { Button } from '../ui';

@Component({
  host: { class: 'block' },
  imports: [Button],
  selector: 'app-deferred-error',
  templateUrl: './deferred-error.html',
})
export class DeferredError {
  private readonly document = inject(DOCUMENT);
  public readonly section = input('esta sección');

  public reload(): void {
    this.document.defaultView?.location.reload();
  }
}
