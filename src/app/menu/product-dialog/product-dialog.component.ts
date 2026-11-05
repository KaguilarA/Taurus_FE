import {
  Component,
  computed,
  DestroyRef,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { Icon } from '../../icon';
import type { MenuItem, MenuSelection, Serving, Settings } from '../../interfaces';
import { Button } from '../../shared/ui';
import { Select } from '../../shared/ui/select';
import { MenuApi } from '../menu-api.service';
import { menuCategory, menuMoney } from '../menu-format';
import { SERVING_OPTIONS } from '../menu.models';
@Component({
  host: { class: 'contents' },
  selector: 'app-product-dialog',
  imports: [Select, Button, Icon],
  templateUrl: './product-dialog.component.html',
})
export class ProductDialogComponent {
  private readonly api = inject(MenuApi);
  private readonly destroyRef = inject(DestroyRef);
  public readonly settings = input.required<Settings>();
  public readonly canOrder = input(false);
  public readonly submitting = input(false);
  public readonly routed = input(false);
  public readonly closed = output<void>();
  public readonly productAdded = output<MenuSelection>();
  public readonly product = signal<MenuItem | null>(null);
  public readonly loading = signal(false);
  public readonly error = signal('');
  public readonly imageFailed = signal(false);
  public readonly serving = signal<Serving>('shot');
  public readonly servings = SERVING_OPTIONS;
  public readonly servingChoices = SERVING_OPTIONS.map((option) => ({
    value: option.key,
    label: option.label,
  }));
  public readonly showPrices = computed(() => this.settings().showMenuPrices !== false);
  public readonly category = computed(() => {
    const product = this.product();
    return product ? menuCategory(product) : '';
  });
  public readonly image = computed(() => (this.imageFailed() ? '' : (this.product()?.image ?? '')));
  public readonly money = (value: number): string => menuMoney(value, this.settings().currency);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private request?: AbortController;
  private requestVersion = 0;
  private selectedId = '';
  constructor() {
    this.destroyRef.onDestroy(() => this.request?.abort());
  }
  public open(selection: MenuSelection): void {
    this.selectedId = selection.product._id;
    this.product.set(selection.product);
    this.error.set('');
    this.imageFailed.set(false);
    this.serving.set(selection.serving === 'unit' ? 'shot' : selection.serving);
    const dialog = this.dialog().nativeElement;
    if (!dialog.open) dialog.showModal();
    this.loadDetails(selection.product._id);
  }
  public openById(id: string, serving: Serving = 'shot'): void {
    this.selectedId = id;
    this.product.set(null);
    this.error.set('');
    this.imageFailed.set(false);
    this.serving.set(serving);
    const dialog = this.dialog().nativeElement;
    if (!dialog.open) dialog.showModal();
    this.loadDetails(id);
  }
  public close(): void {
    if (this.routed()) {
      this.closed.emit();
      return;
    }
    this.request?.abort();
    this.requestVersion++;
    this.dialog().nativeElement.close();
    this.product.set(null);
  }
  public handleClosed(): void {
    if (!this.dialog().nativeElement.open) {
      this.request?.abort();
      this.requestVersion++;
      this.product.set(null);
      if (this.routed()) this.closed.emit();
    }
  }
  public handleCancel(event: Event): void {
    event.preventDefault();
    this.close();
  }
  public handleBackdrop(event: MouseEvent): void {
    const dialog = this.dialog().nativeElement;
    if (event.target !== dialog) return;
    const bounds = dialog.getBoundingClientRect();
    if (
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom
    )
      this.close();
  }
  public retry(): void {
    if (this.selectedId) this.loadDetails(this.selectedId);
  }
  public addToOrder(): void {
    const product = this.product();
    if (!product || !this.canOrder() || this.submitting() || this.loading() || this.error()) return;
    this.productAdded.emit({
      product,
      serving: product.inventory === 'ml' ? this.serving() : 'unit',
    });
    this.close();
  }
  private async loadDetails(id: string): Promise<void> {
    this.request?.abort();
    const request = new AbortController();
    this.request = request;
    const version = ++this.requestVersion;
    this.loading.set(true);
    this.error.set('');
    try {
      const product = await this.api.product(id, request.signal);
      if (!this.destroyRef.destroyed && version === this.requestVersion) this.product.set(product);
    } catch (error) {
      if (!request.signal.aborted && version === this.requestVersion)
        this.error.set(error instanceof Error ? error.message : 'No pudimos cargar los detalles.');
    } finally {
      if (!this.destroyRef.destroyed && version === this.requestVersion) this.loading.set(false);
    }
  }
}
