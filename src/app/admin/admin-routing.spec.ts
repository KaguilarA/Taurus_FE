import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { filter, firstValueFrom, take } from 'rxjs';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { Api, Role, State } from '../api';
import { routes } from '../app.routes';
import { adminReturnUrl } from './admin.guards';
import { adminRoutes } from './admin.routes';
import { AdminShell } from './admin-shell';
import { LoginPage } from './login/login';
import { OrderActivity } from './order-activity';

describe('Dashboard child routes and access control', () => {
  let api: Api;
  let authenticated: boolean;
  let role: Role;
  const state: State = {
    settings: {
      name: 'Test business',
      subtitle: 'Bar',
      tagline: 'Welcome',
      description: 'Menu',
      heroImage: '',
      address: '',
      hours: '',
      phone: '',
      currency: 'CRC',
      accent: '#f5a623',
      servings: { shot: 30, small: 60, large: 90 },
    },
    products: [],
    promotions: [],
    events: [],
    sales: [],
    movements: [],
  };

  beforeEach(() => {
    authenticated = true;
    role = 'admin';
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideLocationMocks()] });
    api = TestBed.inject(Api);
    vi.spyOn(api, 'status').mockImplementation(async () => {
      api.authenticated.set(authenticated);
      api.role.set(authenticated ? role : null);
    });
    vi.spyOn(api, 'load').mockImplementation(async () => api.state.set(structuredClone(state)));
    vi.spyOn(api, 'request').mockImplementation(async (path) => {
      if (path === '/setup/status') return { required: false, businessRequired: false } as never;
      if (path === '/public') return { settings: state.settings } as never;
      if (path === '/admin/service') return { bills: [], orders: [] } as never;
      if (path === '/admin/order-activity') return { hasOrders: false } as never;
      if (path.startsWith('/admin/reports')) return { revenue: 0, count: 0, ranking: [] } as never;
      if (path === '/admin/me')
        return { _id: 'self', name: 'Owner', username: 'owner', role } as never;
      return [] as never;
    });
  });

  it('protects a cold deep link before instantiating the shell and preserves its destination', async () => {
    authenticated = false;
    const harness = await RouterTestingHarness.create('/admin/products');
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/admin/login?returnUrl=%2Fadmin%2Fproducts');
    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(LoginPage);
    expect(api.load).not.toHaveBeenCalled();
    expect(vi.mocked(api.request).mock.calls.some(([path]) => path === '/admin/service')).toBe(
      false,
    );
  });

  it('loads each administrator section through its own child route and page', async () => {
    const harness = await RouterTestingHarness.create();
    for (const route of adminRoutes.filter((route) => route.loadComponent)) {
      await harness.navigateByUrl('/admin/' + route.path);
      await harness.fixture.whenStable();
      expect(TestBed.inject(Router).url).toBe('/admin/' + route.path);
      expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(AdminShell);
      expect(harness.routeNativeElement?.querySelector('app-admin-' + route.path)).toBeTruthy();
      expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).not.toBe('');
    }
  });

  it.each(['kitchen', 'waiter'] as const)(
    'restricts every direct administrator-only link for %s',
    async (staffRole) => {
      role = staffRole;
      const harness = await RouterTestingHarness.create('/admin/service');
      for (const route of adminRoutes.filter((route) => route.data?.['roles'].length === 1)) {
        await harness.navigateByUrl('/admin/' + route.path);
        expect(TestBed.inject(Router).url).toBe('/admin/service');
        expect(harness.routeNativeElement?.querySelector('app-admin-' + route.path)).toBeNull();
      }
      await harness.navigateByUrl('/admin/profile');
      expect(TestBed.inject(Router).url).toBe('/admin/profile');
      expect(api.request).not.toHaveBeenCalledWith(
        expect.stringMatching(/^\/admin\/(reports|tables|accounts)/),
      );
    },
  );

  it('reuses the shell and its single order lifecycle while route history changes the active page', async () => {
    // The harness navigates directly; bootstrap normally installs the popstate listener.
    TestBed.inject(Router).setUpLocationChangeListener();
    const harness = await RouterTestingHarness.create('/admin/products');
    const shell = harness.routeDebugElement!.componentInstance as AdminShell;
    const activity = harness.routeDebugElement!.injector.get(OrderActivity);
    await harness.navigateByUrl('/admin/inventory');
    expect(harness.routeDebugElement!.componentInstance).toBe(shell);
    expect(harness.routeDebugElement!.injector.get(OrderActivity)).toBe(activity);
    const back = firstValueFrom(
      TestBed.inject(Router).events.pipe(
        filter((event) => event instanceof NavigationEnd),
        take(1),
      ),
    );
    TestBed.inject(Location).back();
    await back;
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/admin/products');
    expect(
      harness.routeNativeElement
        ?.querySelector('a[href="/admin/products"]')
        ?.getAttribute('aria-current'),
    ).toBe('page');
    const forward = firstValueFrom(
      TestBed.inject(Router).events.pipe(
        filter((event) => event instanceof NavigationEnd),
        take(1),
      ),
    );
    TestBed.inject(Location).forward();
    await forward;
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/admin/inventory');
    expect(harness.routeDebugElement!.componentInstance).toBe(shell);
  });

  it('rechecks expired sessions and changed roles before navigating to another child', async () => {
    const harness = await RouterTestingHarness.create('/admin/products');
    role = 'kitchen';
    await harness.navigateByUrl('/admin/settings');
    expect(TestBed.inject(Router).url).toBe('/admin/service');
    authenticated = false;
    await harness.navigateByUrl('/admin/profile');
    expect(TestBed.inject(Router).url).toBe('/admin/login?returnUrl=%2Fadmin%2Fprofile');
    expect(api.state()).toBeNull();
  });

  it('returns to the requested child after login without reloading the document', async () => {
    authenticated = false;
    const harness = await RouterTestingHarness.create('/admin/products');
    await harness.fixture.whenStable();
    const page = harness.routeDebugElement!.componentInstance as LoginPage;
    vi.spyOn(api, 'login').mockImplementation(async () => {
      authenticated = true;
      api.authenticated.set(true);
      api.role.set(role);
    });
    page.username = 'owner';
    page.password = 'test-only-password';
    await page.login();
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/admin/products');
    expect(harness.routeNativeElement?.querySelector('app-admin-products')).toBeTruthy();
  });

  it('fails closed when the session cannot be verified and rejects external return URLs', async () => {
    vi.mocked(api.status).mockRejectedValue(new Error('Offline'));
    await RouterTestingHarness.create('/admin/reports');
    expect(TestBed.inject(Router).url).toBe('/admin/login?returnUrl=%2Fadmin%2Freports');
    for (const value of [
      'https://other.example',
      '//other.example',
      '/admin/../setup',
      '/admin/login',
      null,
    ])
      expect(adminReturnUrl(value)).toBe('/admin/service');
    expect(adminReturnUrl('/admin/settings')).toBe('/admin/settings');
  });
});
