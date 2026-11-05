import type { Product } from './index';

export interface ProductType {
  _id: string;
  code: string;
  name: string;
  description?: string;
  inventoryModes: Product['inventory'][];
  requiresDrinkType: boolean;
  kitchen: boolean;
  active?: boolean;
}
