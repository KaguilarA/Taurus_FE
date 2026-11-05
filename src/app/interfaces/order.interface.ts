import type { Sale } from './index';

export interface Order extends Sale {
  billId: string;
  orderStatus: 'pending' | 'preparing' | 'ready' | 'delivered';
  notes: string;
}
