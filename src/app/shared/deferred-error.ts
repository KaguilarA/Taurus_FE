import { DOCUMENT } from '@angular/common';
import { Component, inject, input } from '@angular/core';

@Component({
  selector: 'app-deferred-error',
  template: `<section class="page-width py-12" role="alert">
    <p>No pudimos cargar {{ section() }}. Revisá tu conexión y volvé a intentar.</p>
    <button type="button" class="button outline mt-4" (click)="reload()">Volver a cargar</button>
  </section>`,
  styles: ':host {display:block}',
})
export class DeferredError {
  readonly section = input('esta sección');
  private readonly document = inject(DOCUMENT);
  reload() {
    this.document.defaultView?.location.reload();
  }
}
