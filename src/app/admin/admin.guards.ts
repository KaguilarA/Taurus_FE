import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';
import { Api, Role } from '../api';

const supportedRoles: readonly Role[] = ['admin', 'waiter', 'kitchen'];
const hasSession = (api: Api) => api.authenticated() && supportedRoles.includes(api.role()!);

export function adminReturnUrl(value: string | null): string {
  // Only internal dashboard destinations are valid after signing in.
  return value && /^\/admin(?:\/[a-z-]+)?$/.test(value) && value !== '/admin/login'
    ? value
    : '/admin/service';
}

export const adminSessionGuard: CanActivateFn = async (_route, state) => {
  const api = inject(Api);
  const router = inject(Router);
  try {
    await api.status();
    if (hasSession(api)) {
      await api.load();
      return true;
    }
  } catch {
    api.state.set(null);
  }
  return router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
};

export const adminRoleGuard: CanActivateChildFn = async (route, state) => {
  const api = inject(Api);
  const router = inject(Router);
  try {
    const previousRole = api.role();
    await api.status();
    if (!hasSession(api)) {
      api.state.set(null);
      return router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
    }
    if (previousRole !== api.role()) {
      api.state.set(null);
      await api.load();
    }
    const roles: readonly Role[] = route.data['roles'] ?? [];
    return api.role() && roles.includes(api.role()!) ? true : router.parseUrl('/admin/service');
  } catch {
    api.state.set(null);
    return router.createUrlTree(['/admin/login'], { queryParams: { returnUrl: state.url } });
  }
};
