import type { Product, Serving } from './index';

export interface CartLine {
  product: Product;
  serving: Serving | 'unit';
  quantity: number;
  price: number;
}
