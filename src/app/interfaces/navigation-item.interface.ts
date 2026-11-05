import type { IconName } from './index';

export interface NavigationItem {
  readonly id: string;
  readonly icon: IconName;
  readonly label: string;
}
