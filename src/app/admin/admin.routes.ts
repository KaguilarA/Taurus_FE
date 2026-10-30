import { Routes } from '@angular/router';
import { Role } from '../api';

const staff: readonly Role[] = ['admin', 'waiter', 'kitchen'];
const owner: readonly Role[] = ['admin'];

export const adminRoutes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'service' },
  {
    path: 'service',
    data: { roles: staff, label: 'Pedidos en vivo' },
    loadComponent: () => import('./pages/service').then((m) => m.ServicePage),
  },
  {
    path: 'profile',
    data: { roles: staff, label: 'Mi perfil' },
    loadComponent: () => import('./pages/profile').then((m) => m.ProfilePage),
  },
  {
    path: 'overview',
    data: { roles: owner, label: 'Resumen' },
    loadComponent: () => import('./pages/overview').then((m) => m.OverviewPage),
  },
  {
    path: 'sales',
    data: { roles: owner, label: 'Punto de venta' },
    loadComponent: () => import('./pages/sales').then((m) => m.SalesPage),
  },
  {
    path: 'inventory',
    data: { roles: owner, label: 'Inventario' },
    loadComponent: () => import('./pages/inventory').then((m) => m.InventoryPage),
  },
  {
    path: 'products',
    data: { roles: owner, label: 'Productos' },
    loadComponent: () => import('./pages/products').then((m) => m.ProductsPage),
  },
  {
    path: 'promotions',
    data: { roles: owner, label: 'Promociones' },
    loadComponent: () => import('./pages/promotions').then((m) => m.PromotionsPage),
  },
  {
    path: 'events',
    data: { roles: owner, label: 'Eventos' },
    loadComponent: () => import('./pages/events').then((m) => m.EventsPage),
  },
  {
    path: 'reports',
    data: { roles: owner, label: 'Reportes' },
    loadComponent: () => import('./pages/reports').then((m) => m.ReportsPage),
  },
  {
    path: 'settings',
    data: { roles: owner, label: 'Personalización' },
    loadComponent: () => import('./pages/settings').then((m) => m.SettingsPage),
  },
  {
    path: 'tables',
    data: { roles: owner, label: 'Mesas y códigos QR' },
    loadComponent: () => import('./pages/tables').then((m) => m.TablesPage),
  },
  {
    path: 'accounts',
    data: { roles: owner, label: 'Equipo y roles' },
    loadComponent: () => import('./pages/accounts').then((m) => m.AccountsPage),
  },
  { path: '**', redirectTo: 'service' },
];
