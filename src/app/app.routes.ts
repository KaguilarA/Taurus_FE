import { adminSessionGuard, adminRoleGuard } from './admin/admin.guards';
import { Routes } from '@angular/router';
import { firstAdminGuard, configuredGuard, businessSetupGuard, startupGuard } from './setup.guard';

export const routes: Routes = [
  {
    path: 'start',
    canActivate: [startupGuard],
    loadComponent: () => import('./startup').then((m) => m.StartupPage),
  },
  {
    path: 'business/setup',
    canActivate: [businessSetupGuard],
    loadComponent: () => import('./business-setup').then((m) => m.BusinessSetupPage),
  },
  {
    path: 'setup',
    canActivate: [firstAdminGuard],
    loadComponent: () => import('./setup').then((m) => m.SetupPage),
  },
  {
    path: '',
    canActivate: [configuredGuard],
    loadComponent: () => import('./public').then((m) => m.PublicPage),
    children: [
      {
        path: 'producto/:productId',
        loadComponent: () =>
          import('./menu/product-dialog/product-route').then((m) => m.ProductRoute),
      },
    ],
  },
  {
    path: 'cuenta',
    canActivate: [configuredGuard],
    loadComponent: () => import('./account').then((m) => m.AccountPage),
    children: [
      {
        path: 'producto/:productId',
        loadComponent: () =>
          import('./menu/product-dialog/product-route').then((m) => m.ProductRoute),
      },
    ],
  },
  {
    path: 'admin/login',
    canActivate: [configuredGuard],
    loadComponent: () => import('./admin/login/login').then((m) => m.LoginPage),
  },
  {
    path: 'admin',
    canActivate: [configuredGuard, adminSessionGuard],
    canActivateChild: [adminRoleGuard],
    loadComponent: () => import('./admin/admin-shell').then((m) => m.AdminShell),
    loadChildren: () => import('./admin/admin.routes').then((m) => m.adminRoutes),
  },
  { path: '**', redirectTo: '' },
];
