import { DeferBlockState, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { Api, PublicState } from './api';
import { PublicPage } from './public';

describe('Landing and account separation', () => {
  it('shows a skeleton while loading, then presents the hero and reusable menu without account controls', async () => {
    TestBed.configureTestingModule({ imports: [PublicPage], providers: [provideRouter([])] });
    let complete!: (data: PublicState) => void;
    vi.spyOn(TestBed.inject(Api), 'request').mockReturnValue(
      new Promise<PublicState>((resolve) => {
        complete = resolve;
      }),
    );
    const fixture = TestBed.createComponent(PublicPage);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('app-page-skeleton')).toBeTruthy();
    expect(element.textContent).not.toContain('Cargando la carta');
    complete({
      settings: {
        name: 'El Encuentro',
        tagline: 'Buena compañía',
        description: 'Comida y bebidas',
        currency: 'CRC',
        heroImage: '',
        address: '',
        hours: '',
        phone: '',
        accent: '#f5a623',
        servings: { shot: 30, small: 60, large: 90 },
      },
      menu: { items: [], total: 0, page: 1, pageSize: 9, pageCount: 0 },
      promotions: [],
      events: [],
    });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.querySelector('.landing-hero h1')?.textContent).toBe('Buena compañía');
    expect(element.querySelector('app-menu')).toBeNull();
    expect(element.querySelector('app-public-events')).toBeNull();
    expect(element.querySelector('app-public-promotions')).toBeNull();
    expect(element.querySelector('app-section-skeleton#carta')).toBeTruthy();
    const [menuBlock] = await fixture.getDeferBlocks();
    await menuBlock.render(DeferBlockState.Loading);
    expect(element.querySelector('app-section-skeleton#carta')).toBeTruthy();
    await menuBlock.render(DeferBlockState.Complete);
    fixture.detectChanges();
    expect(element.querySelector('app-menu')).toBeTruthy();
    expect(element.querySelector('a[href="/cuenta"]')).toBeTruthy();
    expect(element.querySelector('.ticker, .guest-account, .guest-cart-link')).toBeNull();
  });
});
