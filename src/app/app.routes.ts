import { Routes } from '@angular/router';
import { firstAdminGuard, configuredGuard, businessSetupGuard } from './setup.guard';

export const routes: Routes = [
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
    pathMatch: 'full',
    canActivate: [configuredGuard],
    loadComponent: () => import('./public').then((m) => m.PublicPage),
  },
  {
    path: 'admin',
    canActivate: [configuredGuard],
    loadComponent: () => import('./admin').then((m) => m.AdminPage),
  },
  { path: '**', redirectTo: '' },
];
