import type { Serving } from '../../interfaces';

export const SERVING_OPTIONS: readonly { key: Serving; name: string }[] = [
  { key: 'large', name: 'Grande' },
  { key: 'small', name: 'Pequeño' },
  { key: 'shot', name: 'Shot' },
];
