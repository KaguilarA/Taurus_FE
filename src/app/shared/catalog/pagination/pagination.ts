import { Toolbar, ToolbarWidget } from '@angular/aria/toolbar';
import { Component, computed, input, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  imports: [Toolbar, ToolbarWidget],
  host: { class: 'block' },
  templateUrl: './pagination.html',
})
export class Pagination {
  public readonly page = input(1);
  public readonly total = input(0);
  public readonly pageSize = input(9);
  public readonly busy = input(false);
  public readonly label = input('Páginas del catálogo');
  public readonly pageChanged = output<number>();

  public readonly pageCount = computed(() =>
    Math.ceil(Math.max(0, this.total()) / Math.max(1, this.pageSize())),
  );
  public readonly current = computed(() => Math.max(1, Math.min(this.page(), this.pageCount())));
  public readonly first = computed(() => (this.current() - 1) * this.pageSize() + 1);
  public readonly last = computed(() => Math.min(this.current() * this.pageSize(), this.total()));
  public readonly numbers = computed(() => {
    const start = Math.max(1, Math.min(this.current() - 2, this.pageCount() - 4));
    return Array.from({ length: Math.min(5, this.pageCount()) }, (_, i) => start + i);
  });
}
