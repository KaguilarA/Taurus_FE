import type { ChartConfiguration } from 'chart.js';

export type SalesChartConfig = ChartConfiguration<'bar' | 'pie', number[], string>;
