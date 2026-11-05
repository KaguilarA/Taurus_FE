import type { MenuPage, State } from './index';

export type PublicState = Pick<
  State,
  'settings' | 'promotions' | 'events' | 'recommendations' | 'productTypes'
> & {
  menu: MenuPage;
};
