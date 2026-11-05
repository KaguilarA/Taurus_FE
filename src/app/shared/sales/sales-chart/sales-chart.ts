import {
  afterRenderEffect,
  Component,
  ElementRef,
  inject,
  InjectionToken,
  input,
  viewChild,
} from '@angular/core';
import {
  ArcElement,
  BarController,
  BarElement,
  CategoryScale,
  Chart,
  Legend,
  LinearScale,
  PieController,
  Tooltip,
} from 'chart.js';
import type { ChartSeries, SalesChartConfig } from '../../../interfaces';
Chart.register(
  BarController,
  BarElement,
  PieController,
  ArcElement,
  CategoryScale,
  LinearScale,
  Legend,
  Tooltip,
);
export const SALES_CHART_FACTORY = new InjectionToken<
  (canvas: HTMLCanvasElement, config: SalesChartConfig) => Pick<Chart, 'destroy'>
>('SalesChartFactory', {
  providedIn: 'root',
  factory: () => (canvas, config) => new Chart(canvas, config),
});
@Component({
  selector: 'app-sales-chart',
  host: { class: 'block min-w-0' },
  templateUrl: './sales-chart.html',
})
export class SalesChart {
  private readonly createChart = inject(SALES_CHART_FACTORY);
  public readonly title = input.required<string>();
  public readonly series = input.required<ChartSeries>();
  public readonly type = input<'bar' | 'pie'>('bar');
  public readonly metric = input('Unidades vendidas');
  private readonly canvas = viewChild.required<ElementRef<HTMLCanvasElement>>('canvas');
  constructor() {
    afterRenderEffect((onCleanup) => {
      const element = this.canvas().nativeElement;
      const series = this.series();
      const type = this.type();
      const styles = getComputedStyle(element);
      const accent = styles.getPropertyValue('--accent').trim() || '#f5a623';
      const foreground = styles.getPropertyValue('--text-muted').trim() || '#ada399';
      const border = styles.getPropertyValue('--border').trim() || '#403a32';
      const palette = series.labels.map((_, i) =>
        i === 0 ? accent : `hsl(${(i * 137.508 + 25) % 360} 50% 58%)`,
      );
      const config: SalesChartConfig = {
        type,
        data: {
          labels: [...series.labels],
          datasets: [
            {
              label: this.metric(),
              data: [...series.values],
              backgroundColor: palette,
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
            ? false
            : { duration: 200 },
          plugins: {
            legend: { display: type === 'pie', position: 'bottom', labels: { color: foreground } },
          },
          ...(type === 'bar'
            ? {
                indexAxis: 'y' as const,
                scales: {
                  x: {
                    beginAtZero: true,
                    ticks: { color: foreground, precision: 0 },
                    grid: { color: border },
                  },
                  y: { ticks: { color: foreground }, grid: { display: false } },
                },
              }
            : {}),
        },
      };
      const chart = this.createChart(element, config);
      onCleanup(() => chart.destroy());
    });
  }
}
