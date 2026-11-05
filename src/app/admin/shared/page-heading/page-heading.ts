import { Component, computed, effect, inject, input } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { Api } from '../../../api';
@Component({
  selector: 'app-admin-page-heading',
  templateUrl: './page-heading.html',
})
export class AdminPageHeading {
  private readonly api = inject(Api);
  private readonly documentTitle = inject(Title);
  public readonly businessName = computed(
    () => this.api.state()?.settings?.name ?? 'Administración',
  );
  public readonly title = input.required<string>();
  public readonly description = input('');
  constructor() {
    effect(() =>
      this.documentTitle.setTitle(
        `${this.title()} · ${this.api.state()?.settings.name ?? 'Administración'}`,
      ),
    );
  }
}
