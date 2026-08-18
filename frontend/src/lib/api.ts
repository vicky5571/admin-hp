const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const API_PREFIX = "/api/v1";

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
  meta?: Record<string, unknown>;
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public details?: unknown,
  ) {
    super(message);
  }
}

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<ApiEnvelope<T>> {
  const token = getToken();

  const res = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      res.status,
      json?.error?.message ?? "Request failed",
      json,
    );
  }

  return json as ApiEnvelope<T>;
}

// ── Auth ────────────────────────────────────────────────────────────
export interface LoginResponse {
  token: string;
  user: {
    id: number;
    fullName: string;
    role: string;
  };
}

export function login(username: string, password: string) {
  return apiFetch<LoginResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify({ username, password }),
  });
}

// ── Products ────────────────────────────────────────────────────────
export interface Product {
  id: number;
  sku: string;
  name: string;
  productType: string;
  costPrice: string;
  sellingPrice: string;
  isActive: boolean;
  brand?: { id: number; name: string };
  category?: { id: number; name: string };
}

export function fetchProducts(params?: {
  q?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  return apiFetch<Product[]>(`/products?${query.toString()}`);
}

// ── Sales ───────────────────────────────────────────────────────────
export interface SaleItemDto {
  productId: number;
  qty: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  imeis?: string[];
}

export interface PaymentDto {
  method: string;
  amount: number;
  referenceNo?: string;
}

export interface CreateSalePayload {
  customerId?: number;
  items: SaleItemDto[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  payments: PaymentDto[];
  notes?: string;
}

export function quoteSale(items: SaleItemDto[]) {
  return apiFetch<{
    subtotal: number;
    discountTotal: number;
    taxTotal: number;
    grandTotal: number;
  }>("/sales/quote", {
    method: "POST",
    body: JSON.stringify({ items }),
  });
}

export function createSale(payload: CreateSalePayload) {
  return apiFetch<unknown>("/sales", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── Reports ─────────────────────────────────────────────────────────
export function fetchSalesSummary(params?: {
  period?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  const query = new URLSearchParams();
  if (params?.period) query.set("period", params.period);
  if (params?.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params?.dateTo) query.set("dateTo", params.dateTo);
  return apiFetch<{ period: string; data: any[] }>(
    `/reports/sales-summary?${query.toString()}`,
  );
}

export function fetchStockOnHand() {
  return apiFetch<{ summary: any; data: any[] }>("/reports/stock-on-hand");
}

export function fetchGrossProfit(params?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  const query = new URLSearchParams();
  if (params?.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params?.dateTo) query.set("dateTo", params.dateTo);
  return apiFetch<{ summary: any; data: any[] }>(
    `/reports/gross-profit?${query.toString()}`,
  );
}

export function fetchReturnsSummary() {
  return apiFetch<{
    summary: { totalReturns: number; totalRefunded: string };
    byDay: any[];
    byMethod: any[];
  }>("/reports/returns-summary");
}

// ── Suppliers ───────────────────────────────────────────────────────
export interface Supplier {
  id: number;
  supplierCode: string;
  name: string;
  contactPerson?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  paymentTermsDays: number;
  isActive: boolean;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  pageCount: number;
}

export function fetchSuppliers(params?: { q?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  query.set("limit", String(params?.limit ?? 100));
  return apiFetch<Supplier[]>(`/suppliers?${query.toString()}`);
}

// ── Purchase Orders ─────────────────────────────────────────────────
export interface PoItem {
  id: number;
  productId: number;
  orderedQty: number;
  receivedQty: number;
  unitCost: string;
  product?: Product;
}

export interface PurchaseOrder {
  id: number;
  poNumber: string;
  supplierId: number;
  status: string;
  orderDate: string;
  expectedDate: string | null;
  notes: string | null;
  createdAt: string;
  supplier?: { id: number; name: string };
  items: PoItem[];
  creator?: { id: number; fullName: string };
}

export interface CreatePoPayload {
  supplierId: number;
  orderDate: string;
  expectedDate?: string;
  notes?: string;
  items: { productId: number; orderedQty: number; unitCost: number }[];
}

export function fetchPurchaseOrders(params?: {
  status?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.status) query.set("status", params.status);
  query.set("page", String(params?.page ?? 1));
  query.set("limit", String(params?.limit ?? 20));
  return apiFetch<PurchaseOrder[]>(`/purchase-orders?${query.toString()}`);
}

export function fetchPurchaseOrder(id: number) {
  return apiFetch<PurchaseOrder>(`/purchase-orders/${id}`);
}

export function createPurchaseOrder(payload: CreatePoPayload) {
  return apiFetch<PurchaseOrder>("/purchase-orders", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function submitPurchaseOrder(id: number) {
  return apiFetch<PurchaseOrder>(`/purchase-orders/${id}/submit`, {
    method: "POST",
  });
}

export function cancelPurchaseOrder(id: number) {
  return apiFetch<PurchaseOrder>(`/purchase-orders/${id}/cancel`, {
    method: "POST",
  });
}

// ── Goods Receipts ──────────────────────────────────────────────────
export interface GrItem {
  id: number;
  poItemId: number;
  productId: number;
  receivedQty: number;
  unitCost: string;
  product?: Product;
  imeis?: {
    id: number;
    imeiUnit?: { id: number; imei: string; status?: string };
  }[];
}

export interface GoodsReceipt {
  id: number;
  grnNumber: string;
  purchaseOrderId: number;
  receiveDate: string;
  notes: string | null;
  createdAt: string;
  purchaseOrder?: { id: number; poNumber: string };
  receiver?: { id: number; fullName: string };
  items: GrItem[];
}

export interface CreateGrPayload {
  purchaseOrderId: number;
  receiveDate: string;
  notes?: string;
  items: {
    poItemId: number;
    productId: number;
    receivedQty: number;
    unitCost: number;
    imeis?: string[];
  }[];
}

export function fetchGoodsReceipts(params?: { page?: number; limit?: number }) {
  const query = new URLSearchParams();
  query.set("page", String(params?.page ?? 1));
  query.set("limit", String(params?.limit ?? 20));
  return apiFetch<GoodsReceipt[]>(`/goods-receipts?${query.toString()}`);
}

export function fetchGoodsReceipt(id: number) {
  return apiFetch<GoodsReceipt>(`/goods-receipts/${id}`);
}

export function createGoodsReceipt(payload: CreateGrPayload) {
  return apiFetch<GoodsReceipt>("/goods-receipts", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

// ── IMEI ────────────────────────────────────────────────────────────
export interface ImeiUnit {
  id: number;
  imei: string;
  productId: number;
  status: string;
  currentLocation: string;
  lastRefType: string | null;
  lastRefId: number | null;
  createdAt: string;
  updatedAt: string;
  product?: Product;
}

export function fetchImeiUnits(params?: {
  q?: string;
  status?: string;
  productId?: number;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.status) query.set("status", params.status);
  if (params?.productId) query.set("productId", String(params.productId));
  query.set("page", String(params?.page ?? 1));
  query.set("limit", String(params?.limit ?? 20));
  return apiFetch<ImeiUnit[]>(`/imei?${query.toString()}`);
}

export function lookupImei(imei: string) {
  return apiFetch<{
    unit: ImeiUnit;
    sale: { id: number; invoiceNumber: string; saleTime: string } | null;
    return: { id: number; returnNumber: string; createdAt: string } | null;
    goodsReceipt: {
      id: number;
      grnNumber: string;
      purchaseOrder?: { poNumber: string };
    } | null;
  }>(`/imei/lookup/${encodeURIComponent(imei)}`);
}

export function fetchAvailableImeis(productId: number) {
  return apiFetch<ImeiUnit[]>(
    `/imei/available?productId=${productId}`,
  );
}

export function updateImeiStatus(
  id: number,
  payload: { status: string; location?: string },
) {
  return apiFetch<ImeiUnit>(`/imei/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

