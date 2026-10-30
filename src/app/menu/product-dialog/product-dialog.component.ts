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
import type { Serving, Settings } from '../../api';
import { Icon } from '../../icon';
import { MenuApi } from '../menu-api.service';
import { menuCategory, menuMoney } from '../menu-format';
import { isServing, SERVING_OPTIONS, type MenuItem, type MenuSelection } from '../menu.models';
@Component({
  selector: 'app-product-dialog',
  imports: [Icon],
  templateUrl: './product-dialog.component.html',
  styleUrl: './product-dialog.component.css',
})
export class ProductDialogComponent {
  readonly settings = input.required<Settings>();
  readonly canOrder = input(false);
  readonly submitting = input(false);
  readonly productAdded = output<MenuSelection>();
  readonly product = signal<MenuItem | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly imageFailed = signal(false);
  readonly serving = signal<Serving>('shot');
  readonly servings = SERVING_OPTIONS;
  readonly showPrices = computed(() => this.settings().showMenuPrices !== false);
  readonly category = computed(() => {
    const product = this.product();
    return product ? menuCategory(product) : '';
  });
  readonly image = computed(() => (this.imageFailed() ? '' : (this.product()?.image ?? '')));
  readonly money = (value: number) => menuMoney(value, this.settings().currency);
  private readonly dialog = viewChild.required<ElementRef<HTMLDialogElement>>('dialog');
  private readonly api = inject(MenuApi);
  private readonly destroyRef = inject(DestroyRef);
  private request?: AbortController;
  private requestVersion = 0;
  constructor() {
    this.destroyRef.onDestroy(() => this.request?.abort());
  }
  open(selection: MenuSelection) {
    this.product.set(selection.product);
    this.error.set('');
    this.imageFailed.set(false);
    this.serving.set(selection.serving === 'unit' ? 'shot' : selection.serving);
    const dialog = this.dialog().nativeElement;
    if (!dialog.open) dialog.showModal();
    void this.loadDetails(selection.product._id);
  }
  close() {
    this.request?.abort();
    this.requestVersion++;
    this.dialog().nativeElement.close();
    this.product.set(null);
  }
  handleClosed() {
    if (!this.dialog().nativeElement.open) {
      this.request?.abort();
      this.requestVersion++;
      this.product.set(null);
    }
  }
  handleCancel(event: Event) {
    event.preventDefault();
    this.close();
  }
  handleBackdrop(event: MouseEvent) {
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
  chooseServing(event: Event) {
    if (event.target instanceof HTMLSelectElement && isServing(event.target.value))
      this.serving.set(event.target.value);
  }
  retry() {
    const product = this.product();
    if (product) void this.loadDetails(product._id);
  }
  addToOrder() {
    const product = this.product();
    if (!product || !this.canOrder() || this.submitting() || this.loading() || this.error()) return;
    this.productAdded.emit({
      product,
      serving: product.inventory === 'ml' ? this.serving() : 'unit',
    });
    this.close();
  }
  private async loadDetails(id: string) {
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
