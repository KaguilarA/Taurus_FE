import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';

import { PaymentMethod, servingName } from '../../api';
import { Icon } from '../../icon';

import { PageSkeleton } from '../../page-skeleton';
import { AdminPageHeading } from '../shared/page-heading';
import { AdminTask } from '../shared/admin-task';
import { OrderActivity } from '../order-activity';
@Component({
  selector: 'app-admin-service',
  imports: [AdminPageHeading, PageSkeleton, FormsModule, DatePipe, Icon],
  templateUrl: './service.html',
  styleUrl: './service.css',
})
export class ServicePage extends AdminTask {
  readonly activity = inject(OrderActivity);
  billMethods: Record<string, PaymentMethod> = {};
  billReferences: Record<string, string> = {};
  readonly statusName = (status: string) =>
    ({
      pending: 'Pedida',
      preparing: 'En preparación',
      ready: 'Por servir',
      delivered: 'Servida',
    })[status] ?? status;
  readonly servingName = servingName;
  advance(id: string, status: string, itemIndex?: number) {
    void this.run(async () => {
      await this.api.request('/admin/orders/' + id, 'PATCH', {
        status,
        ...(itemIndex === undefined ? {} : { itemIndex }),
      });
      await this.activity.loadService();
    }, 'Pedido actualizado.');
  }
  payBill(id: string) {
    void this.run(async () => {
      await this.api.request('/admin/bills/' + id + '/pay', 'POST', {
        method: this.billMethods[id] ?? 'cash',
        reference: this.billReferences[id] ?? '',
      });
      await this.activity.loadService();
      await this.api.load();
    }, 'Pago registrado y cuenta cerrada.');
  }
  refreshOrders() {
    void this.run(() => this.activity.loadService());
  }
}
