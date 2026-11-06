import type { Serving } from './index';

export interface Product {
  _id: string;
  name: string;
  description: string;
  image: string;
  category: string;
  productType?: string;
  bottleLiters?: number;
  drinkType?: 'non_alcoholic' | 'alcoholic' | '';
  inventory: 'none' | 'unit' | 'ml';
  price: number;
  purchasePrice?: number;
  prices: Record<Serving, number>;
  bottleMl: number;
  stock: number;
  minimum: number;
  active: boolean;
  featured: boolean;
}
