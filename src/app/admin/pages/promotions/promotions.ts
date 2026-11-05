import { DatePipe } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Icon } from '../../../icon';
import { ImageUpload } from '../../../image-upload';
import type { Promotion } from '../../../interfaces';
import { Button, Dialog, Feedback } from '../../../shared/ui';
import { PageSkeleton } from '../../../shared/ui/page-skeleton';
import { updateField } from '../../../shared/update-field';
import { AdminTask } from '../../shared/admin-task';
import { AdminPageHeading } from '../../shared/page-heading';
@Component({
  selector: 'app-admin-promotions',
  imports: [
    Dialog,
    Button,
    Feedback,
    AdminPageHeading,
    PageSkeleton,
    FormsModule,
    DatePipe,
    Icon,
    ImageUpload,
  ],
  templateUrl: './promotions.html',
})
export class PromotionsPage extends AdminTask {
  public readonly updateField = updateField;
  public readonly promotion = signal<Promotion | null>(null);
  public editPromotion(promo?: Promotion): void {
    const local = (value: string) => {
      const d = new Date(value);
      return new Date(+d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    this.promotion.set(
      promo
        ? { ...structuredClone(promo), starts: local(promo.starts), ends: local(promo.ends) }
        : {
            _id: '',
            title: '',
            description: '',
            image: '',
            starts: local(new Date().toISOString()),
            ends: local(new Date(Date.now() + 7 * 86400000).toISOString()),
            active: true,
          },
    );
  }
  public savePromotion(): void {
    const promo = this.promotion()!;
    this.run(async () => {
      await this.api.request(
        '/admin/promotions' + (promo._id ? '/' + promo._id : ''),
        promo._id ? 'PUT' : 'POST',
        {
          ...promo,
          starts: new Date(promo.starts).toISOString(),
          ends: new Date(promo.ends).toISOString(),
        },
      );
      this.promotion.set(null);
      await this.api.load();
    }, 'Promoción guardada.');
  }
}
