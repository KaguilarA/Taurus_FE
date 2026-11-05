import type { Product } from './index';

export type MenuItem = Readonly<
  Pick<
    Product,
    | '_id'
    | 'name'
    | 'description'
    | 'image'
    | 'category'
    | 'drinkType'
    | 'inventory'
    | 'price'
    | 'prices'
    | 'featured'
  >
>;
