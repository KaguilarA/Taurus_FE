import { Role } from './api';
import { IconName } from './icon-names';

interface NavigationItem {
  readonly id: string;
  readonly icon: IconName;
  readonly label: string;
}

interface NavigationGroup {
  readonly id: string;
  readonly label: string;
  readonly adminOnly?: boolean;
  readonly items: readonly NavigationItem[];
}

const navigation: readonly NavigationGroup[] = [
  {
    id: 'operations',
    label: 'Operación diaria',
    items: [{ id: 'service', icon: 'activity', label: 'Pedidos en vivo' }],
  },
  {
    id: 'management',
    label: 'Gestión',
    adminOnly: true,
    items: [
      { id: 'overview', icon: 'house', label: 'Resumen' },
      { id: 'sales', icon: 'shopping-bag', label: 'Punto de venta' },
      { id: 'tables', icon: 'qr-code', label: 'Mesas y códigos QR' },
      { id: 'products', icon: 'utensils', label: 'Productos' },
      { id: 'inventory', icon: 'package', label: 'Inventario' },
      { id: 'reports', icon: 'chart-no-axes-combined', label: 'Reportes' },
    ],
  },
  {
    id: 'content',
    label: 'Carta y comunicación',
    adminOnly: true,
    items: [
      { id: 'promotions', icon: 'sparkles', label: 'Promociones' },
      { id: 'events', icon: 'calendar-days', label: 'Eventos' },
    ],
  },
  {
    id: 'business',
    label: 'Negocio',
    adminOnly: true,
    items: [
      { id: 'settings', icon: 'settings-2', label: 'Personalización' },
      { id: 'accounts', icon: 'users-round', label: 'Equipo y roles' },
    ],
  },
  {
    id: 'account',
    label: 'Tu cuenta',
    items: [{ id: 'profile', icon: 'user-round', label: 'Mi perfil' }],
  },
];

export function navigationFor(role: Role | null): readonly NavigationGroup[] {
  if (!role) return [];
  return navigation.filter((group) => !group.adminOnly || role === 'admin');
}
