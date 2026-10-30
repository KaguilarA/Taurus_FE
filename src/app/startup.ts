import { Component, inject } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-startup',
  template: `
    <main class="business-onboarding">
      <p class="eyebrow">INICIO DEL SITIO</p>
      <h1>Conectemos tu negocio.</h1>
      <p role="alert">No pudimos verificar la configuración del negocio. Volvé a intentar en un momento.</p>
      <button class="button accent" type="button" (click)="retry()">Volver a intentar</button>
    </main>
  `,
})
export class StartupPage {
  private readonly document = inject(DOCUMENT);
  constructor() {
    inject(Title).setTitle('Inicio del sitio');
  }
  retry() {
    this.document.defaultView?.location.reload();
  }
}
