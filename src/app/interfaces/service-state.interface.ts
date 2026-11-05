import type { Order, ServiceBill } from './index';

export interface ServiceState {
  bills: ServiceBill[];
  orders: Order[];
}
