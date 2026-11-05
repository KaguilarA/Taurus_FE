import type { MenuItem } from './index';

export interface MenuPage {
  readonly items: readonly MenuItem[];
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly pageCount: number;
}
