import type { InvoiceLine } from './invoice-line.interface';
export interface PurchaseInvoice {
  _id: string;
  supplier: string;
  invoiceNumber: string;
  currency: string;
  source: 'quimar-pdf' | 'local-ocr';
  lines: InvoiceLine[];
}
