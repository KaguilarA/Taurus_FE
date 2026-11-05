import { TestBed } from '@angular/core/testing';
import { SalesInsights } from './index';

it('combines historical product lines and includes liquor under beverages without losing snack totals', () => {
  const fixture = TestBed.createComponent(SalesInsights);
  const row = (productId: string, category: string, quantity: number) => ({
    _id: { productId, category },
    name: productId,
    quantity,
    revenue: 100,
  });
  fixture.componentRef.setInput('ranking', [
    row('ron', 'drink', 2),
    row('ron', 'liquor', 3),
    row('papas', 'snack', 4),
    row('tacos', 'food', 1),
  ]);
  const insights = fixture.componentInstance;
  expect(insights.products()).toEqual({ labels: ['ron', 'papas', 'tacos'], values: [5, 4, 1] });
  expect(insights.categoriesSeries()).toEqual({
    labels: ['Bebida', 'Snacks y botanas', 'Comida'],
    values: [5, 4, 1],
  });
  insights.category.set('snack');
  expect(insights.products()).toEqual({ labels: ['papas'], values: [4] });
  insights.category.set('drink');
  expect(insights.products()).toEqual({ labels: ['ron'], values: [5] });
});
