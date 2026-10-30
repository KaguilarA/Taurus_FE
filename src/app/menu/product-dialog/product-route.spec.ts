import { Location } from '@angular/common';
import { provideLocationMocks } from '@angular/common/testing';
import { DeferBlockState, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { NavigationEnd, provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { filter, firstValueFrom, take } from 'rxjs';
import { vi } from 'vitest';
import { AccountPage } from '../../account';
import { Api, PublicState } from '../../api';
import { routes } from '../../app.routes';
import { PublicPage } from '../../public';
import { MenuComponent } from '../menu.component';
import { MenuItem } from '../menu.models';

describe('Product details as a routed modal', () => {
  let api: Api;
  const product: MenuItem = {
    _id: 'soda',
    name: 'Refresco',
    description: 'Descripción completa',
    image: '',
    category: 'drink',
    drinkType: 'non_alcoholic',
    inventory: 'unit',
    price: 1500,
    prices: { large: 0, small: 0, shot: 0 },
    featured: false,
  };
  const data: PublicState = {
    settings: {
      name: 'Test bar',
      tagline: 'Welcome',
      description: 'Menu',
      heroImage: '',
      address: '',
      hours: '',
      phone: '',
      currency: 'CRC',
      accent: '#f5a623',
      servings: { large: 90, small: 60, shot: 30 },
    },
    menu: { items: [product], page: 1, pageSize: 9, pageCount: 1, total: 1 },
    promotions: [],
    events: [],
  };
  const nextNavigation = () =>
    firstValueFrom(
      TestBed.inject(Router).events.pipe(
        filter((event) => event instanceof NavigationEnd),
        take(1),
      ),
    );

  beforeEach(() => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.setAttribute('open', '');
      },
    });
    Object.defineProperty(HTMLDialogElement.prototype, 'close', {
      configurable: true,
      value: function (this: HTMLDialogElement) {
        this.removeAttribute('open');
        this.dispatchEvent(new Event('close'));
      },
    });
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideLocationMocks()] });
    TestBed.inject(Router).setUpLocationChangeListener();
    api = TestBed.inject(Api);
    vi.spyOn(api, 'request').mockImplementation(async (path) => {
      if (path === '/setup/status') return { required: false, businessRequired: false } as never;
      if (path === '/public') return structuredClone(data) as never;
      if (path.startsWith('/public/menu?')) return structuredClone(data.menu) as never;
      if (path === '/public/menu/missing') throw new Error('Producto no disponible.');
      if (path.startsWith('/public/menu/'))
        return {
          ...product,
          _id: path.split('/').at(-1),
          name: path.endsWith('/other') ? 'Otro producto' : product.name,
        } as never;
      if (path === '/public/bills/visit')
        return {
          token: 'visit',
          label: 'Mesa 4',
          status: 'open',
          total: 0,
          balance: 0,
          orders: [],
        } as never;
      throw new Error('Unexpected request: ' + path);
    });
  });

  it('opens a direct child URL, loads the selected ID and closes to its landing parent', async () => {
    const harness = await RouterTestingHarness.create('/producto/soda');
    await harness.fixture.whenStable();
    expect(harness.routeDebugElement?.componentInstance).toBeInstanceOf(PublicPage);
    const dialog = harness.routeNativeElement!.querySelector('dialog')!;
    expect(dialog.open).toBe(true);
    expect(dialog.textContent).toContain('Descripción completa');
    expect(api.request).toHaveBeenCalledWith(
      '/public/menu/soda',
      'GET',
      undefined,
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    const closed = nextNavigation();
    (dialog.querySelector('.dialog-close') as HTMLButtonElement).click();
    await closed;
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeNativeElement!.querySelector('dialog[open]')).toBeNull();
  });

  it('keeps the menu instance and filters while Back closes and Forward reopens the modal', async () => {
    const harness = await RouterTestingHarness.create('/');
    await harness.fixture.whenStable();
    const parent = harness.routeDebugElement!.componentInstance;
    const [menuBlock] = await harness.fixture.getDeferBlocks();
    await menuBlock.render(DeferBlockState.Complete);
    harness.detectChanges();
    const menu = harness.routeDebugElement!.query(By.directive(MenuComponent))
      .componentInstance as MenuComponent;
    menu.store.setCategory('drink');
    await harness.fixture.whenStable();
    const opened = nextNavigation();
    menu.openDetails({ product, serving: 'unit' });
    await opened;
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/producto/soda');
    expect(harness.routeDebugElement!.componentInstance).toBe(parent);
    const back = nextNavigation();
    TestBed.inject(Location).back();
    await back;
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/');
    expect(harness.routeDebugElement!.query(By.directive(MenuComponent)).componentInstance).toBe(
      menu,
    );
    expect(menu.store.query().category).toBe('drink');
    const forward = nextNavigation();
    TestBed.inject(Location).forward();
    await forward;
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.querySelector('dialog')?.open).toBe(true);
    await harness.navigateByUrl('/producto/other');
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.querySelector('dialog')?.textContent).toContain(
      'Otro producto',
    );
  });

  it('shows an error for a missing product and still allows the child route to close', async () => {
    const harness = await RouterTestingHarness.create('/producto/missing');
    await harness.fixture.whenStable();
    expect(harness.routeNativeElement!.querySelector('dialog')?.textContent).toContain(
      'Producto no disponible.',
    );
    const closed = nextNavigation();
    harness.routeNativeElement!.querySelector<HTMLButtonElement>('.dialog-close')!.click();
    await closed;
    expect(TestBed.inject(Router).url).toBe('/');
  });

  it('adds to the existing account draft and preserves the account URL when closing', async () => {
    const harness = await RouterTestingHarness.create('/cuenta/producto/soda?cuenta=visit');
    await harness.fixture.whenStable();
    const parent = harness.routeDebugElement!.componentInstance as AccountPage;
    expect(parent).toBeInstanceOf(AccountPage);
    expect(parent.bill()?.token).toBe('visit');
    const button = [
      ...harness.routeNativeElement!.querySelectorAll<HTMLButtonElement>('dialog button'),
    ].find((button) => button.textContent?.includes('Agregar al pedido'))!;
    expect(button.disabled).toBe(false);
    const closed = nextNavigation();
    button.click();
    await closed;
    expect(parent.cart()).toHaveLength(1);
    expect(parent.total()).toBe(1500);
    expect(TestBed.inject(Router).url).toBe('/cuenta?cuenta=visit');
    expect(harness.routeDebugElement!.componentInstance).toBe(parent);
  });
});
