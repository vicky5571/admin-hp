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
