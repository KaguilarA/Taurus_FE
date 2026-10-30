import { TestBed } from '@angular/core/testing';
import { ProductCardComponent } from './product-card.component';
import type { Settings } from '../../api';
import type { MenuItem } from '../menu.models';
describe('ProductCardComponent', () => {
  it('renders a compact card without a photo or starburst and respects price visibility', () => {
    const fixture = TestBed.createComponent(ProductCardComponent);
    fixture.componentRef.setInput('product', {
      _id: 'pilsen',
      name: 'Pilsen',
      description: 'Cerveza nacional bien fría.',
      category: 'drink',
      drinkType: 'alcoholic',
      inventory: 'unit',
      price: 1500,
      prices: {},
      image: '/unused.png',
      featured: false,
    } as MenuItem);
    fixture.componentRef.setInput('settings', {
      currency: 'CRC',
      showMenuPrices: true,
    } as Settings);
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('img')).toBeNull();
    expect(element.querySelector('.menu-item-price')).not.toBeNull();
    expect(element.textContent).toContain('Cerveza nacional');
    const details = vi.fn();
    fixture.componentInstance.detailsRequested.subscribe(details);
    element.querySelector<HTMLButtonElement>('.menu-item-details')!.click();
    expect(details).toHaveBeenCalledWith(
      expect.objectContaining({ product: expect.objectContaining({ _id: 'pilsen' }) }),
    );
    fixture.componentRef.setInput('settings', {
      currency: 'CRC',
      showMenuPrices: false,
    } as Settings);
    fixture.detectChanges();
    expect(element.querySelector('.menu-item-price')).toBeNull();
    fixture.destroy();
  });
});
