import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { Api } from '../../../../api';
import type { Product, PurchaseInvoice, Settings } from '../../../../interfaces';
import { InvoiceImport } from './invoice-import';

describe('Purchase invoice review', () => {
  let page: InvoiceImport;
  let api: Api;
  const sample = (): PurchaseInvoice => ({
    _id: 'invoice',
    supplier: 'Quimar',
    invoiceNumber: '00100001010000000001',
    currency: 'CRC',
    source: 'quimar-pdf',
    lines: [
      {
        lineIndex: 0,
        description: 'IMPERIAL 1X12 10%',
        quantity: 4,
        unitsPerPack: 12,
        mode: 'units',
        packPrice: 9710.4,
        discountPercent: 10,
        taxPercent: 13,
        productId: 'beer',
        included: true,
      },
    ],
  });
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [InvoiceImport] });
    api = TestBed.inject(Api);
    api.state.set({
      settings: { currency: 'CRC' } as Settings,
      products: [
        {
          _id: 'beer',
          name: 'Imperial',
          active: true,
          inventory: 'unit',
          stock: 5,
          price: 1500,
        } as Product,
        { _id: 'rum', name: 'Ron', active: true, inventory: 'ml', bottleMl: 750 } as Product,
      ],
      promotions: [],
      sales: [],
      movements: [],
    });
    page = TestBed.createComponent(InvoiceImport).componentInstance;
    page.invoice.set(sample());
  });
  it('requires existing matches and explicit package sizes, converts 4 packs to 48 units and computes net cost', () => {
    expect(page.valid()).toBe(true);
    expect(page.delta(page.included()[0])).toBe(48);
    expect(page.cost(page.included()[0])).toBe(728.28);
    page.updateLine(0, 'unitsPerPack', null);
    expect(page.valid()).toBe(false);
    page.updateLine(0, 'unitsPerPack', 12);
    page.updateLine(0, 'productId', 'missing');
    expect(page.valid()).toBe(false);
    page.updateLine(0, 'included', false);
    expect(page.valid()).toBe(false);
  });
  it('validates inventory modes and converts full liquor bottles into milliliters', () => {
    page.updateLine(0, 'productId', 'rum');
    expect(page.valid()).toBe(false);
    page.updateLine(0, 'mode', 'bottles');
    expect(page.delta(page.included()[0])).toBe(36000);
    page.updateLine(0, 'quantity', 1.5);
    expect(page.valid()).toBe(false);
  });
  it('retains the same draft on network failure and prevents resubmission after a successful commit with failed refresh', async () => {
    const request = vi
      .spyOn(api, 'request')
      .mockRejectedValueOnce(new Error('Sin conexión'))
      .mockResolvedValue({ status: 'confirmed' });
    vi.spyOn(api, 'load').mockRejectedValue(new Error('No se pudo actualizar la vista'));
    await page.confirm();
    expect(page.confirmed()).toBe(false);
    expect(page.invoice()?._id).toBe('invoice');
    await page.confirm();
    expect(page.confirmed()).toBe(true);
    expect(page.error()).toContain('vista');
    await page.confirm();
    expect(request).toHaveBeenCalledTimes(2);
    expect(request).toHaveBeenLastCalledWith(
      '/admin/products/invoices/invoice/confirm',
      'POST',
      expect.objectContaining({
        updatePurchasePrices: true,
        entries: [
          expect.objectContaining({ quantity: 4, unitsPerPack: 12, purchasePrice: 728.28 }),
        ],
      }),
    );
  });
  it('uploads a file without changing stock and clears the previous review when another file is selected', async () => {
    const request = vi.spyOn(api, 'request').mockResolvedValue(sample());
    page.file.set(new File(['test'], 'invoice.pdf', { type: 'application/pdf' }));
    await page.read();
    expect(request).toHaveBeenCalledWith(
      '/admin/products/invoices/preview',
      'POST',
      expect.any(FormData),
    );
    expect(api.state()?.products[0].stock).toBe(5);
    page.chooseFile({ target: { files: [new File(['other'], 'photo.png')] } } as unknown as Event);
    expect(page.invoice()).toBe(null);
  });
  it('announces file controls, uses the shared accessible selectors and displays the review', async () => {
    const fixture = TestBed.createComponent(InvoiceImport);
    fixture.componentInstance.invoice.set(sample());
    fixture.detectChanges();
    await fixture.whenStable();
    const native = fixture.nativeElement as HTMLElement;
    expect(native.querySelector('input[type=file]')?.closest('label')?.textContent).toContain(
      'Factura',
    );
    const select = native.querySelector(
      'button[aria-label="Producto del renglón 1"]',
    ) as HTMLButtonElement;
    expect(select).toBeTruthy();
    expect(select.textContent).toContain('Imperial');
    select.focus();
    select.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    fixture.detectChanges();
    await fixture.whenStable();
    expect(select.getAttribute('aria-expanded')).toBe('true');
    expect(native.textContent).toContain('+48 unidades');
  });
});
