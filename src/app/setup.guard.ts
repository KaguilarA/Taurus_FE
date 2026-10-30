import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { Api } from './api';

// Always check the server. A cached flag cannot protect an initial registration.
export const firstAdminGuard: CanActivateFn = async () => {
  const api = inject(Api);
  const router = inject(Router);
  try {
    return (await api.request<{ required: boolean }>('/setup/status')).required
      ? true
      : router.parseUrl('/admin');
  } catch {
    return router.parseUrl('/admin');
  }
};

export const configuredGuard: CanActivateFn = async (route, state) => {
  const api = inject(Api);
  const router = inject(Router);
  try {
    const setup = await api.request<{ required: boolean; businessRequired: boolean }>(
      '/setup/status',
    );
    if (setup.required) return router.parseUrl('/setup');
    if (setup.businessRequired) {
      if (!state.url.startsWith('/admin')) return router.parseUrl('/admin');
      const auth = await api.request<{ authenticated: boolean; role: string }>('/auth/status');
      if (auth.authenticated && auth.role === 'admin') return router.parseUrl('/business/setup');
    }
    return true;
  } catch {
    // The existing pages already display API connection errors. Never open setup
    // merely because the database or network could not be reached.
    return true;
  }
};

export const businessSetupGuard: CanActivateFn = async () => {
  const api = inject(Api);
  const router = inject(Router);
  try {
    const setup = await api.request<{ required: boolean; businessRequired: boolean }>(
      '/setup/status',
    );
    if (setup.required) return router.parseUrl('/setup');
    if (!setup.businessRequired) return router.parseUrl('/admin');
    const auth = await api.request<{ authenticated: boolean; role: string }>('/auth/status');
    return auth.authenticated && auth.role === 'admin' ? true : router.parseUrl('/admin');
  } catch {
    return router.parseUrl('/admin');
  }
};
