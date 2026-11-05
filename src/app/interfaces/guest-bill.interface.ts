import type { Order, PaymentMethod } from './index';

export interface GuestBill {
  token: string;
  label: string;
  status: 'open' | 'paid';
  total: number;
  balance: number;
  paymentMethod?: PaymentMethod;
  orders: Order[];
}
