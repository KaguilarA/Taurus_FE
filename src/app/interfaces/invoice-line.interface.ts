export interface InvoiceLine {
  lineIndex: number;
  description: string;
  quantity: number | null;
  unitsPerPack: number | null;
  mode: string;
  packPrice: number | null;
  discountPercent: number | null;
  taxPercent: number | null;
  productId: string;
  matchSource?: 'saved' | 'name' | 'ambiguous' | 'unmatched';
  included: boolean;
}
