import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { ProductDetails } from './product-details';
import { Product } from './api';
describe('Product detail dialog', () => {
  it('opens a native modal, shows the full description and emits close', async () => {
    const showModal = vi.fn();
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {configurable:true,value:showModal});
    TestBed.configureTestingModule({imports:[ProductDetails]});
    const fixture=TestBed.createComponent(ProductDetails);
    fixture.componentRef.setInput('product', {_id:'soda', name:'Refresco', description:'Descripción completa del producto', image:'https://example.com/soda.png',category:'drink',drinkType:'non_alcoholic',inventory:'unit',price:1500} as Product);
    fixture.componentRef.setInput('currency','CRC');
    const dismissed=vi.fn();fixture.componentInstance.dismissed.subscribe(dismissed);
    fixture.detectChanges();await fixture.whenStable();
    expect(showModal).toHaveBeenCalledOnce();
    const element=fixture.nativeElement as HTMLElement;
    expect(element.textContent).toContain('Descripción completa del producto');
    expect(element.textContent).toContain('Libre de alcohol');
    expect(element.querySelector('img')?.getAttribute('src')).toBe('https://example.com/soda.png');
    element.querySelector('button')!.click();expect(dismissed).toHaveBeenCalledOnce();
    fixture.destroy();
  });
});
