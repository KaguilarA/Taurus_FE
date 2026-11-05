import type { MenuSelection, Settings } from './index';

export interface ProductOutletContext {
  settings: Settings;
  canOrder?: boolean;
  submitting?: boolean;
  addToOrder?: (selection: MenuSelection) => void;
}
