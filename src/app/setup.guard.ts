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
      if (!state.url.startsWith('/admin')) return router.parseUrl('/start');
      const auth = await api.request<{ authenticated: boolean; role: string }>('/auth/status');
      if (auth.authenticated && auth.role === 'admin') return router.parseUrl('/business/setup');
    }
    return true;
  } catch {
    // A failed check must never make the public menu accessible.
    return state.url.startsWith('/admin') ? true : router.parseUrl('/start');
  }
};

export const startupGuard: CanActivateFn = async () => {
  const api = inject(Api);
  const router = inject(Router);
  try {
    const setup = await api.request<{ required: boolean; businessRequired: boolean }>(
      '/setup/status',
    );
    if (setup.required) return router.parseUrl('/setup');
    if (!setup.businessRequired) return router.parseUrl('/');
    const auth = await api.request<{ authenticated: boolean; role: string }>('/auth/status');
    return router.parseUrl(auth.authenticated && auth.role === 'admin' ? '/business/setup' : '/admin');
  } catch {
    // Render a recoverable connection error; never reopen registration on failure.
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
