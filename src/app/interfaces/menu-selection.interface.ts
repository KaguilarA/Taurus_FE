import type { MenuItem, Serving } from './index';

export interface MenuSelection {
  readonly product: MenuItem;
  readonly serving: Serving | 'unit';
}
