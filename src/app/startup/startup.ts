import { DOCUMENT } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Button } from '../shared/ui';
@Component({
  imports: [Button],
  selector: 'app-startup',
  templateUrl: './startup.html',
})
export class StartupPage {
  private readonly document = inject(DOCUMENT);
  constructor() {
    inject(Title).setTitle('Inicio del sitio');
  }
  public retry(): void {
    const view = this.document.defaultView;
    if (!view) return;
    const url = new URL(view.location.href);
    url.searchParams.delete('connection');
    view.location.replace(url.href);
  }
}
