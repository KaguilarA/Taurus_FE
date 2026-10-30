import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { Settings, Serving } from '../../api';
import { Icon } from '../../icon';
import { ImageUpload } from '../../image-upload';
import { PageSkeleton } from '../../page-skeleton';
import { AdminPageHeading } from '../shared/page-heading';
import { AdminTask } from '../shared/admin-task';

@Component({
  selector: 'app-admin-settings',
  imports: [AdminPageHeading, PageSkeleton, FormsModule, Icon, ImageUpload],
  templateUrl: './settings.html',
})
export class SettingsPage extends AdminTask {
  readonly MathFloor = Math.floor;
  readonly sizes: { key: Serving; name: string }[] = [
    { key: 'large', name: 'Grande' },
    { key: 'small', name: 'Pequeño' },
    { key: 'shot', name: 'Shot' },
  ];
  settings: Settings | null = null;
  saveSettings() {
    void this.run(async () => {
      await this.api.request('/admin/settings', 'PUT', this.settings);
      await this.api.load();
    }, 'Personalización publicada en la carta.');
  }
  constructor() {
    super();
    this.settings = {
      ...structuredClone(this.api.state()!.settings),
      showMenuPrices: this.api.state()!.settings.showMenuPrices ?? true,
    };
  }
}
