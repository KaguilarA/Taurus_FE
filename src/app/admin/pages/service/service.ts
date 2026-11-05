import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { servingName } from '../../../api';
import { Icon } from '../../../icon';
import type { PaymentMethod } from '../../../interfaces';
import { Button, Feedback } from '../../../shared/ui';
import { PageSkeleton } from '../../../shared/ui/page-skeleton';
import { updateField } from '../../../shared/update-field';
import { OrderActivity } from '../../order-activity';
import { AdminTask } from '../../shared/admin-task';
import { AdminPageHeading } from '../../shared/page-heading';
@Component({
  selector: 'app-admin-service',
  imports: [Button, Feedback, AdminPageHeading, PageSkeleton, FormsModule, DatePipe, Icon],
  templateUrl: './service.html',
})
export class ServicePage extends AdminTask {
  protected readonly activity = inject(OrderActivity);
  public readonly updateField = updateField;
  public readonly billMethods = signal<Record<string, PaymentMethod>>({});
  public readonly billReferences = signal<Record<string, string>>({});
  public readonly statusName = (status: string): string =>
    ({
      pending: 'Pedida',
      preparing: 'En preparación',
      ready: 'Por servir',
      delivered: 'Servida',
    })[status] ?? status;
  public readonly servingName = servingName;
  public advance(id: string, status: string, itemIndex?: number): void {
    this.run(async () => {
      await this.api.request('/admin/orders/' + id, 'PATCH', {
        status,
        ...(itemIndex === undefined ? {} : { itemIndex }),
      });
      await this.activity.loadService();
    }, 'Pedido actualizado.');
  }
  public payBill(id: string): void {
    this.run(async () => {
      await this.api.request('/admin/bills/' + id + '/pay', 'POST', {
        method: this.billMethods()[id] ?? 'cash',
        reference: this.billReferences()[id] ?? '',
      });
      await this.activity.loadService();
      await this.api.load();
    }, 'Pago registrado y cuenta cerrada.');
  }
  public refreshOrders(): void {
    this.run(() => this.activity.loadService());
  }
}
