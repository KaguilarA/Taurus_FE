import type { Order, PaymentMethod, Product } from './index';

export interface Sale {
  _id: string;
  label: string;
  total: number;
  status: string;
  createdAt: string;
  billId?: string;
  paymentMethod?: PaymentMethod;
  items: {
    name: string;
    category?: Product['category'];
    kitchen?: boolean;
    fulfillmentStatus?: Order['orderStatus'];
    serving: string;
    quantity: number;
    amount: number;
  }[];
}
