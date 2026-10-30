import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { Promotion } from '../../api';
import { Icon } from '../../icon';
import { ImageUpload } from '../../image-upload';
import { PageSkeleton } from '../../page-skeleton';
import { AdminPageHeading } from '../shared/page-heading';
import { AdminTask } from '../shared/admin-task';

@Component({
  selector: 'app-admin-promotions',
  imports: [AdminPageHeading, PageSkeleton, FormsModule, DatePipe, Icon, ImageUpload],
  templateUrl: './promotions.html',
})
export class PromotionsPage extends AdminTask {
  promotion: Promotion | null = null;
  editPromotion(promo?: Promotion) {
    const local = (value: string) => {
      const d = new Date(value);
      return new Date(+d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    };
    this.promotion = promo
      ? { ...structuredClone(promo), starts: local(promo.starts), ends: local(promo.ends) }
      : {
          _id: '',
          title: '',
          description: '',
          image: '',
          starts: local(new Date().toISOString()),
          ends: local(new Date(Date.now() + 7 * 86400000).toISOString()),
          active: true,
        };
  }
  savePromotion() {
    const promo = this.promotion!;
    void this.run(async () => {
      await this.api.request(
        '/admin/promotions' + (promo._id ? '/' + promo._id : ''),
        promo._id ? 'PUT' : 'POST',
        {
          ...promo,
          starts: new Date(promo.starts).toISOString(),
          ends: new Date(promo.ends).toISOString(),
        },
      );
      this.promotion = null;
      await this.api.load();
    }, 'Promoción guardada.');
  }
}
