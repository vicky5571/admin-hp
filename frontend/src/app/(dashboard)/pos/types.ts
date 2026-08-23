export interface CartItem {
  productId: number;
  sku: string;
  name: string;
  productType: string;
  qty: number;
  unitPrice: number;
  srp: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  imeis: string[];
}

export interface HeldCart {
  id: string;
  savedAt: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}

export interface SplitPaymentLine {
  id: string;
  method: string;
  amount: number;
  referenceNo?: string;
}

export interface OfflineSaleQueueItem {
  id: string; // Offline temp invoice e.g. OFF-1234
  idempotencyKey: string;
  timestamp: string;
  payload: any;
  receiptData: any;
  synced: boolean;
  syncError?: string;
}
