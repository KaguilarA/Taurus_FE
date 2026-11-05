import type { NavigationItem } from './index';

export interface NavigationGroup {
  readonly id: string;
  readonly label: string;
  readonly adminOnly?: boolean;
  readonly items: readonly NavigationItem[];
}
