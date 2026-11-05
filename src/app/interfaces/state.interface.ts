import type {
  CalendarEvent,
  MenuItem,
  Movement,
  Product,
  ProductType,
  Promotion,
  Sale,
  Settings,
} from './index';

export interface State {
  productTypes?: ProductType[];
  settings: Settings;
  products: Product[];
  promotions: Promotion[];
  sales: Sale[];
  movements: Movement[];
  events?: CalendarEvent[];
  recommendations?: MenuItem[];
}
