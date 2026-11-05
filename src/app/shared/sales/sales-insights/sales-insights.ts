import { Tab, TabContent, TabList, TabPanel, Tabs } from '@angular/aria/tabs';
import { Component, computed, input, signal } from '@angular/core';
import { categoryName } from '../../../api';
import type { Report } from '../../../interfaces';
import { ChoiceList, EmptyState, Panel } from '../../ui';
import { SalesChart } from '../sales-chart';
const groupCategory = (category: string) => (category === 'liquor' ? 'drink' : category);
@Component({
  selector: 'app-sales-insights',
  imports: [Tabs, TabList, Tab, TabPanel, TabContent, SalesChart, EmptyState, Panel, ChoiceList],
  templateUrl: './sales-insights.html',
})
export class SalesInsights {
  public readonly ranking = input.required<Report['ranking']>();
  public readonly category = signal('all');
  public readonly categories = [
    { value: 'all', label: 'Todo' },
    { value: 'drink', label: 'Bebidas' },
    { value: 'food', label: 'Comidas' },
    { value: 'snack', label: 'Snacks' },
  ];
  public readonly barTitle = computed(() =>
    this.category() === 'all'
      ? 'Los productos más vendidos'
      : `${categoryName(this.category())}: productos más vendidos`,
  );
  public readonly products = computed(() => {
    const totals = new Map<
      string,
      {
        name: string;
        quantity: number;
      }
    >();
    for (const row of this.ranking()) {
      if (this.category() !== 'all' && groupCategory(row._id.category) !== this.category())
        continue;
      const total = totals.get(row._id.productId);
      totals.set(row._id.productId, {
        name: row.name,
        quantity: row.quantity + (total?.quantity ?? 0),
      });
    }
    const rows = [...totals.values()]
      .sort((a, b) => b.quantity - a.quantity || a.name.localeCompare(b.name))
      .slice(0, 8);
    return { labels: rows.map((row) => row.name), values: rows.map((row) => row.quantity) };
  });
  public readonly categoriesSeries = computed(() => {
    const totals = new Map<string, number>();
    for (const row of this.ranking()) {
      const category = groupCategory(row._id.category);
      totals.set(category, (totals.get(category) ?? 0) + row.quantity);
    }
    return { labels: [...totals.keys()].map(categoryName), values: [...totals.values()] };
  });
}
