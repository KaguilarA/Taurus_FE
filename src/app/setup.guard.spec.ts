import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { vi } from 'vitest';
import { Api } from './api';
import { configuredGuard, firstAdminGuard, businessSetupGuard } from './setup.guard';

@Component({ template: '' })
class Screen {}
describe('Initial administrator routing', () => {
  let required = true;
  let fail = false;
  let businessRequired = false;
  let authenticated = false;
  beforeEach(() => {
    required = true;
    fail = false;
    businessRequired = false;
    authenticated = false;
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: '', pathMatch: 'full', component: Screen, canActivate: [configuredGuard] },
          { path: 'admin', component: Screen, canActivate: [configuredGuard] },
          { path: 'setup', component: Screen, canActivate: [firstAdminGuard] },
          { path: 'business/setup', component: Screen, canActivate: [businessSetupGuard] },
        ]),
        {
          provide: Api,
          useValue: {
            request: vi.fn(async (path: string) => {
              if (fail) throw new Error('Offline');
              return path === '/auth/status'
                ? { authenticated, role: 'admin' }
                : { required, businessRequired };
            }),
          },
        },
      ],
    });
  });
  it('redirects the public menu and admin panel to the initial registration on a new installation', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/');
    expect(TestBed.inject(Router).url).toBe('/setup');
    await harness.navigateByUrl('/admin');
    expect(TestBed.inject(Router).url).toBe('/setup');
  });
  it('blocks a direct setup link once an admin exists', async () => {
    required = false;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/setup');
    expect(TestBed.inject(Router).url).toBe('/admin');
    await harness.navigateByUrl('/');
    expect(TestBed.inject(Router).url).toBe('/');
  });
  it('rechecks the backend instead of trusting an earlier open registration', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/setup');
    required = false;
    await harness.navigateByUrl('/admin');
    await harness.navigateByUrl('/setup');
    expect(TestBed.inject(Router).url).toBe('/admin');
  });
  it('does not open setup when the server is unreachable', async () => {
    fail = true;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/setup');
    expect(TestBed.inject(Router).url).toBe('/admin');
  });
  it('requires business information after registering an administrator', async () => {
    required = false;
    businessRequired = true;
    authenticated = true;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin');
    expect(TestBed.inject(Router).url).toBe('/business/setup');
  });
  it('does not let anonymous users configure the business', async () => {
    required = false;
    businessRequired = true;
    authenticated = false;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/business/setup');
    expect(TestBed.inject(Router).url).toBe('/admin');
  });
  it('closes the initial business form after saving the business', async () => {
    required = false;
    businessRequired = false;
    authenticated = true;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/business/setup');
    expect(TestBed.inject(Router).url).toBe('/admin');
  });
});
