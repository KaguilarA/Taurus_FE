import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ProductDialogComponent } from './product-dialog.component';
import { MenuApi } from '../menu-api.service';
import type { Settings } from '../../api';
import type { MenuItem } from '../menu.models';
const product = {
  _id: 'soda',
  name: 'Refresco',
  description: 'Descripción completa del producto',
  image: 'https://example.com/soda.png',
  category: 'drink',
  drinkType: 'non_alcoholic',
  inventory: 'unit',
  price: 1500,
  prices: {},
  featured: false,
} as MenuItem;
describe('ProductDialogComponent', () => {
  const api = { product: vi.fn() };
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
    TestBed.configureTestingModule({ providers: [{ provide: MenuApi, useValue: api }] });
    api.product.mockReset();
    api.product.mockResolvedValue(product);
  });
  function create() {
    const fixture = TestBed.createComponent(ProductDialogComponent);
    fixture.componentRef.setInput('settings', {
      currency: 'CRC',
      servings: { shot: 30, small: 60, large: 90 },
    } as Settings);
    fixture.detectChanges();
    return fixture;
  }
  it('opens and reopens the persistent dialog with full product details', async () => {
    const fixture = create();
    const component = fixture.componentInstance;
    component.open({ product, serving: 'unit' });
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('dialog')?.open).toBe(true);
    expect(element.textContent).toContain(product.description);
    expect(element.querySelector('img')?.getAttribute('src')).toBe(product.image);
    component.close();
    expect(element.querySelector('dialog')?.open).toBe(false);
    component.open({ product, serving: 'unit' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(element.querySelector('dialog')?.open).toBe(true);
    element.querySelector('dialog')!.dispatchEvent(new Event('cancel', { cancelable: true }));
    expect(element.querySelector('dialog')?.open).toBe(false);
    fixture.destroy();
  });
  it('hides prices in details and provides a fallback for a broken image', async () => {
    const fixture = create();
    fixture.componentRef.setInput('settings', {
      currency: 'CRC',
      showMenuPrices: false,
      servings: { shot: 30, small: 60, large: 90 },
    } as Settings);
    fixture.componentInstance.open({ product, serving: 'unit' });
    await fixture.whenStable();
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('.detail-price')).toBeNull();
    element.querySelector('img')!.dispatchEvent(new Event('error'));
    fixture.detectChanges();
    expect(element.textContent).toContain('Imagen por agregar');
    fixture.destroy();
  });
  it('ignores a pending result after closing the dialog', async () => {
    let finish!: (value: MenuItem) => void;
    api.product.mockImplementationOnce(() => new Promise((resolve) => (finish = resolve)));
    const fixture = create();
    fixture.componentInstance.open({ product, serving: 'unit' });
    fixture.componentInstance.close();
    finish(product);
    await fixture.whenStable();
    expect(fixture.componentInstance.product()).toBeNull();
    fixture.destroy();
  });
});
