import type { Serving } from './index';

export interface Settings {
  name: string;
  subtitle?: string;
  tagline: string;
  description: string;
  heroImage: string;
  logoImage?: string;
  address: string;
  hours: string;
  phone: string;
  currency: string;
  showMenuPrices?: boolean;
  accent: string;
  servings: Record<Serving, number>;
}
