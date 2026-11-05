import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../../icon';
import { ImageUpload } from '../../../image-upload';
import type { Settings } from '../../../interfaces';
import { SERVING_OPTIONS } from '../../../shared/business';
import { Button, Feedback } from '../../../shared/ui';
import { PageSkeleton } from '../../../shared/ui/page-skeleton';
import { updateField } from '../../../shared/update-field';
import { AdminTask } from '../../shared/admin-task';
import { AdminPageHeading } from '../../shared/page-heading';
@Component({
  selector: 'app-admin-settings',
  imports: [Button, Feedback, AdminPageHeading, PageSkeleton, FormsModule, Icon, ImageUpload],
  templateUrl: './settings.html',
})
export class SettingsPage extends AdminTask {
  public readonly updateField = updateField;
  public readonly MathFloor = Math.floor;
  public readonly sizes = SERVING_OPTIONS;
  public readonly settings = signal<Settings | null>(null);
  public saveSettings(): void {
    this.run(async () => {
      await this.api.request('/admin/settings', 'PUT', this.settings());
      await this.api.load();
    }, 'Personalización publicada en la carta.');
  }
  constructor() {
    super();
    this.settings.set({
      ...structuredClone(this.api.state()!.settings),
      showMenuPrices: this.api.state()!.settings.showMenuPrices ?? true,
    });
  }
}
