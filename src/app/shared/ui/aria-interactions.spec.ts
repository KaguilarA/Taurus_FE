import { TestBed } from '@angular/core/testing';
import { ProductEditor } from '../../admin/pages/products/product-editor';
import { Api } from '../../api';
import { ImageUpload } from '../../image-upload';
import type { Product, State } from '../../interfaces';
import { Pagination } from '../catalog/pagination';
import { SALES_CHART_FACTORY } from '../sales/sales-chart';
import { SalesInsights } from '../sales/sales-insights';
import { ChoiceList } from './choice-list';
import { Select } from './select';

const choices = [
  { value: 'shot', label: 'Shot' },
  { value: 'small', label: 'Pequeño' },
  { value: 'large', label: 'Grande' },
];
const key = (element: Element, name: string) =>
  element.dispatchEvent(
    new KeyboardEvent('keydown', { key: name, bubbles: true, cancelable: true }),
  );

it('product selectors use server types, including custom types, and convert bottle liters to ml', async () => {
  const api = TestBed.inject(Api);
  api.state.set({
    productTypes: [
      {
        _id: 'snack',
        code: 'snack',
        name: 'Snacks',
        inventoryModes: ['unit'],
        kitchen: false,
        requiresDrinkType: false,
      },
      {
        _id: 'bottle',
        code: 'liquor',
        name: 'Botellas de licor',
        inventoryModes: ['ml'],
        kitchen: false,
        requiresDrinkType: false,
      },
      {
        _id: 'dessert',
        code: 'dessert',
        name: 'Postres',
        inventoryModes: ['unit'],
        kitchen: true,
        requiresDrinkType: false,
      },
    ],
  } as State);
  const fixture = TestBed.createComponent(ProductEditor);
  fixture.componentRef.setInput('product', {
    _id: '',
    category: 'snack',
    name: 'Ejemplo',
    description: '',
    image: '',
    price: 1000,
    inventory: 'unit',
    stock: 0,
    minimum: 0,
    prices: { shot: 10, small: 20, large: 30 },
    bottleMl: 1000,
    active: true,
    featured: false,
  } as Product);
  fixture.detectChanges();
  await fixture.whenStable();
  expect(fixture.componentInstance.categoryOptions().map((option) => option.label)).toContain(
    'Postres',
  );
  fixture.componentInstance.changeCategory('dessert');
  expect(fixture.componentInstance.product().productType).toBe('dessert');
  expect(fixture.componentInstance.product().inventory).toBe('unit');
  fixture.componentInstance.changeCategory('liquor');
  fixture.componentInstance.setBottleLiters(0.75);
  expect(fixture.componentInstance.product().inventory).toBe('ml');
  expect(fixture.componentInstance.product().bottleMl).toBe(750);
  expect(fixture.componentInstance.product().bottleLiters).toBe(0.75);
  fixture.detectChanges();
  await fixture.whenStable();
  expect((fixture.nativeElement as HTMLElement).querySelectorAll('[role=combobox]').length).toBe(2);
});

it('filters expose a single selection and commit keyboard navigation explicitly', async () => {
  const fixture = TestBed.createComponent(ChoiceList);
  fixture.componentRef.setInput('label', 'Medidas');
  fixture.componentRef.setInput('options', choices);
  fixture.componentRef.setInput('value', 'shot');
  fixture.detectChanges();
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const first = root.querySelector<HTMLElement>('[role=option]')!;
  first.focus();
  key(first, 'ArrowRight');
  await fixture.whenStable();
  expect(fixture.componentInstance.value()).toBe('shot');
  key(document.activeElement!, ' ');
  await fixture.whenStable();
  expect(fixture.componentInstance.value()).toBe('small');
  expect(root.querySelector('[aria-selected=true]')?.textContent).toContain('Pequeño');
  expect(root.querySelectorAll('[aria-selected=true]')).toHaveLength(1);
});

it('selects open, commit an option, close on Escape and respect disabled state', async () => {
  const fixture = TestBed.createComponent(Select);
  fixture.componentRef.setInput('label', 'Presentación');
  fixture.componentRef.setInput('options', choices);
  fixture.componentRef.setInput('value', 'shot');
  fixture.detectChanges();
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const trigger = root.querySelector<HTMLButtonElement>('[role=combobox]')!;
  trigger.focus();
  key(trigger, 'ArrowDown');
  await fixture.whenStable();
  expect(trigger.getAttribute('aria-expanded')).toBe('true');
  const options = root.querySelectorAll<HTMLElement>('[role=option]');
  expect(options).toHaveLength(3);
  options[1].click();
  await fixture.whenStable();
  expect(fixture.componentInstance.value()).toBe('small');
  expect(trigger.textContent).toContain('Pequeño');
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  key(trigger, 'ArrowDown');
  await fixture.whenStable();
  key(trigger, 'Escape');
  await fixture.whenStable();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  expect(document.activeElement).toBe(trigger);
  fixture.componentRef.setInput('disabled', true);
  fixture.detectChanges();
  trigger.click();
  await fixture.whenStable();
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
});

it('pagination moves focus with arrows and preserves the current page until activation', async () => {
  const fixture = TestBed.createComponent(Pagination);
  fixture.componentRef.setInput('total', 40);
  fixture.detectChanges();
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const current = root.querySelector<HTMLButtonElement>('[aria-current=page]')!;
  const changed = vi.fn();
  fixture.componentInstance.pageChanged.subscribe(changed);
  current.focus();
  key(current, 'ArrowRight');
  await fixture.whenStable();
  expect(document.activeElement?.getAttribute('aria-label')).toBe('Página 2');
  expect(changed).not.toHaveBeenCalled();
  (document.activeElement as HTMLButtonElement).click();
  expect(changed).toHaveBeenCalledWith(2);
});

it('accordion triggers link to their panels and preserve the image URL while collapsed', async () => {
  const fixture = TestBed.createComponent(ImageUpload);
  fixture.componentRef.setInput('value', '/images/test.png');
  fixture.detectChanges();
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const trigger = root.querySelector<HTMLButtonElement>('[ngAccordionTrigger]')!;
  expect(trigger.getAttribute('aria-expanded')).toBe('false');
  trigger.click();
  await fixture.whenStable();
  const panel = root.querySelector<HTMLElement>('[ngAccordionPanel]')!;
  expect(trigger.getAttribute('aria-controls')).toBe(panel.id);
  expect(panel.hidden).toBe(false);
  expect(panel.querySelector('input')?.value).toBe('/images/test.png');
  trigger.click();
  await fixture.whenStable();
  expect(panel.hidden).toBe(true);
  expect(fixture.componentInstance.value()).toBe('/images/test.png');
});

it('report tabs link to panels, switch views and release the hidden chart', async () => {
  const destroy = vi.fn();
  TestBed.configureTestingModule({
    providers: [{ provide: SALES_CHART_FACTORY, useValue: () => ({ destroy }) }],
  });
  const fixture = TestBed.createComponent(SalesInsights);
  fixture.componentRef.setInput('ranking', [
    { _id: { productId: 'p', category: 'food' }, name: 'Plato', quantity: 2, revenue: 1000 },
  ]);
  fixture.detectChanges();
  await fixture.whenStable();
  const root = fixture.nativeElement as HTMLElement;
  const tabs = root.querySelectorAll<HTMLButtonElement>('[role=tab]');
  expect(tabs).toHaveLength(2);
  expect(tabs[0].getAttribute('aria-selected')).toBe('true');
  tabs[1].click();
  await fixture.whenStable();
  expect(tabs[1].getAttribute('aria-selected')).toBe('true');
  const visible = root.querySelector<HTMLElement>('[role=tabpanel]:not([hidden])')!;
  expect(visible.id).toBe(tabs[1].getAttribute('aria-controls'));
  expect(visible.getAttribute('aria-labelledby')).toBe(tabs[1].id);
  expect(destroy).toHaveBeenCalled();
});
