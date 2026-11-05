import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { SALES_CHART_FACTORY, SalesChart } from './index';

it('renders bar/pie data reactively and releases chart instances on changes and navigation', async () => {
  const destroy = vi.fn();
  const create = vi.fn(() => ({ destroy }));
  TestBed.configureTestingModule({
    imports: [SalesChart],
    providers: [{ provide: SALES_CHART_FACTORY, useValue: create }],
  });
  const fixture = TestBed.createComponent(SalesChart);
  fixture.componentRef.setInput('title', 'Ventas');
  fixture.componentRef.setInput('series', { labels: ['Papas'], values: [4] });
  fixture.detectChanges();
  await fixture.whenStable();
  expect(create).toHaveBeenLastCalledWith(
    expect.any(HTMLCanvasElement),
    expect.objectContaining({ type: 'bar', data: expect.objectContaining({ labels: ['Papas'] }) }),
  );
  fixture.componentRef.setInput('type', 'pie');
  fixture.componentRef.setInput('series', { labels: ['Comida', 'Bebida'], values: [4, 2] });
  fixture.detectChanges();
  await fixture.whenStable();
  expect(destroy).toHaveBeenCalledTimes(1);
  expect(create).toHaveBeenLastCalledWith(
    expect.any(HTMLCanvasElement),
    expect.objectContaining({ type: 'pie' }),
  );
  fixture.destroy();
  expect(destroy).toHaveBeenCalledTimes(2);
});
