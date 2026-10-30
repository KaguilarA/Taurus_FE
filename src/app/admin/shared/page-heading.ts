import { Component, effect, inject, input } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Api } from '../../api';

@Component({
  selector: 'app-admin-page-heading',
  template: `<div class="section-heading flex flex-wrap gap-4 justify-between items-end">
    <div>
      <p class="eyebrow">{{ api.state()?.settings?.name }} / ADMINISTRACIÓN</p>
      <h1>{{ title() }}</h1>
      <p class="muted">{{ description() }}</p>
    </div>
    <div><ng-content /></div>
  </div>`,
})
export class AdminPageHeading {
  readonly api = inject(Api);
  readonly title = input.required<string>();
  readonly description = input('');
  constructor() {
    const documentTitle = inject(Title);
    effect(() =>
      documentTitle.setTitle(
        `${this.title()} · ${this.api.state()?.settings.name ?? 'Administración'}`,
      ),
    );
  }
}
