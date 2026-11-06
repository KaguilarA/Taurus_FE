import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { InvoiceLine, PurchaseInvoice } from '../../../../interfaces';
import { Button, Feedback, Select } from '../../../../shared/ui';
import { AdminTask } from '../../../shared/admin-task';

@Component({
  selector: 'app-invoice-import',
  imports: [FormsModule, Button, Feedback, Select],
  templateUrl: './invoice-import.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InvoiceImport extends AdminTask {
  private readonly productsById = computed(
    () => new Map((this.api.state()?.products ?? []).map((p) => [p._id, p])),
  );
  public readonly closed = output<void>();
  public readonly invoice = signal<PurchaseInvoice | null>(null);
  public readonly file = signal<File | null>(null);
  public readonly confirmed = signal(false);
  public readonly updatePurchasePrices = signal(true);
  public readonly rememberMatches = signal(true);
  public readonly productOptions = computed(() => [
    { value: '', label: 'Seleccionar producto existente' },
    ...(this.api.state()?.products ?? [])
      .filter((p) => p.active && p.inventory !== 'none')
      .map((p) => ({ value: p._id, label: p.name })),
  ]);
  public readonly modes = [
    { value: '', label: 'Revisar presentación' },
    { value: 'units', label: 'Unidades' },
    { value: 'bottles', label: 'Botellas de licor' },
    { value: 'ml', label: 'Mililitros' },
  ];
  public readonly included = computed(
    () => this.invoice()?.lines.filter((line) => line.included) ?? [],
  );
  public readonly valid = computed(() => {
    const invoice = this.invoice();
    return (
      !!invoice?.supplier.trim() &&
      !!invoice.invoiceNumber.trim() &&
      this.included().length > 0 &&
      this.included().every(
        (line) =>
          this.delta(line) !== null &&
          (line.packPrice === null || (Number.isFinite(line.packPrice) && line.packPrice >= 0)) &&
          (line.discountPercent === null ||
            (Number.isFinite(line.discountPercent) &&
              line.discountPercent >= 0 &&
              line.discountPercent <= 100)),
      )
    );
  });
  public chooseFile(event: Event): void {
    this.file.set((event.target as HTMLInputElement).files?.[0] ?? null);
    this.invoice.set(null);
    this.confirmed.set(false);
    this.error.set('');
    this.notice.set('');
  }
  public async read(): Promise<void> {
    const file = this.file();
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      this.error.set('La factura no puede superar 10 MB.');
      return;
    }
    await this.run(async () => {
      const form = new FormData();
      form.append('invoice', file);
      this.invoice.set(
        await this.api.request<PurchaseInvoice>('/admin/products/invoices/preview', 'POST', form),
      );
    });
  }
  public updateLine(index: number, field: keyof InvoiceLine, value: unknown): void {
    this.invoice.update((invoice) =>
      invoice
        ? {
            ...invoice,
            lines: invoice.lines.map((line) =>
              line.lineIndex === index ? { ...line, [field]: value } : line,
            ),
          }
        : null,
    );
  }
  public updateHeader(field: 'supplier' | 'invoiceNumber', value: string): void {
    this.invoice.update((invoice) => (invoice ? { ...invoice, [field]: value } : null));
  }
  public delta(line: InvoiceLine): number | null {
    const product = this.productsById().get(line.productId);
    if (
      !product?.active ||
      !Number.isInteger(line.quantity) ||
      !Number.isInteger(line.unitsPerPack) ||
      (line.quantity ?? 0) < 1 ||
      (line.unitsPerPack ?? 0) < 1 ||
      (line.quantity ?? 0) > 1000000 ||
      (line.unitsPerPack ?? 0) > 10000 ||
      !['units', 'bottles', 'ml'].includes(line.mode) ||
      (product.inventory === 'unit'
        ? line.mode !== 'units'
        : product.inventory !== 'ml' || line.mode === 'units')
    )
      return null;
    const delta =
      line.quantity! * line.unitsPerPack! * (line.mode === 'bottles' ? product.bottleMl : 1);
    return Number.isSafeInteger(delta) && delta > 0 && delta <= 1e9 ? delta : null;
  }
  public cost(line: InvoiceLine): number | null {
    if (
      line.packPrice === null ||
      line.discountPercent === null ||
      !line.unitsPerPack ||
      line.mode === 'ml'
    )
      return null;
    return (
      Math.round(
        ((line.packPrice * (1 - line.discountPercent / 100)) / line.unitsPerPack) * 10000,
      ) / 10000
    );
  }
  public money(value: number): string {
    return this.api.money(value, this.invoice()?.currency || undefined);
  }
  public unit(line: InvoiceLine): string {
    return this.productsById().get(line.productId)?.inventory === 'ml' ? 'ml' : 'unidades';
  }
  public async confirm(): Promise<void> {
    if (!this.valid() || this.confirmed()) return;
    const invoice = this.invoice()!;
    await this.run(async () => {
      await this.api.request('/admin/products/invoices/' + invoice._id + '/confirm', 'POST', {
        supplier: invoice.supplier,
        invoiceNumber: invoice.invoiceNumber,
        updatePurchasePrices: this.updatePurchasePrices(),
        rememberMatches: this.rememberMatches(),
        entries: this.included().map((line) => ({
          lineIndex: line.lineIndex,
          productId: line.productId,
          quantity: line.quantity,
          unitsPerPack: line.unitsPerPack,
          mode: line.mode,
          purchasePrice: this.cost(line),
        })),
      });
      this.confirmed.set(true);
      await this.api.load();
    }, 'Compra registrada. Las existencias y los costos seleccionados se actualizaron.');
  }
  public async refresh(): Promise<void> {
    await this.run(() => this.api.load(), 'Inventario actualizado.');
  }
}
