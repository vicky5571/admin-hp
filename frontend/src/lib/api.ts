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

// ── Products & Catalog ──────────────────────────────────────────────
export interface Category {
  id: number;
  name: string;
  isActive: boolean;
}

export interface Brand {
  id: number;
  name: string;
  isActive: boolean;
}

export interface TaxClass {
  id: number;
  name: string;
  ratePercent: string;
  isInclusive: boolean;
}

export interface Product {
  id: number;
  sku: string;
  name: string;
  categoryId?: number | null;
  brandId?: number | null;
  productType: "SERIALIZED" | "NON_SERIALIZED" | "SERVICE" | string;
  costPrice: string;
  srp: string;
  taxClassId?: number | null;
  minStockAlert: number;
  isActive: boolean;
  brand?: { id: number; name: string } | null;
  category?: { id: number; name: string } | null;
  taxClass?: { id: number; name: string; ratePercent: string } | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateProductPayload {
  sku: string;
  name: string;
  categoryId?: number;
  brandId?: number;
  productType: string;
  costPrice: number;
  srp: number;
  taxClassId?: number;
  minStockAlert?: number;
  isActive?: boolean;
}

export interface UpdateProductPayload {
  sku?: string;
  name?: string;
  categoryId?: number | null;
  brandId?: number | null;
  productType?: string;
  costPrice?: number;
  srp?: number;
  taxClassId?: number | null;
  minStockAlert?: number;
  isActive?: boolean;
}

export function fetchProducts(params?: {
  q?: string;
  categoryId?: number;
  brandId?: number;
  productType?: string;
  isActive?: boolean;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  if (params?.categoryId) query.set("categoryId", String(params.categoryId));
  if (params?.brandId) query.set("brandId", String(params.brandId));
  if (params?.productType) query.set("productType", params.productType);
  if (params?.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  return apiFetch<Product[]>(`/products?${query.toString()}`);
}

export function fetchProduct(id: number) {
  return apiFetch<Product>(`/products/${id}`);
}

export function createProduct(payload: CreateProductPayload) {
  return apiFetch<Product>("/products", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateProduct(id: number, payload: UpdateProductPayload) {
  return apiFetch<Product>(`/products/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function deleteProduct(id: number) {
  return apiFetch<{ success: boolean; message: string }>(`/products/${id}`, {
    method: "DELETE",
  });
}

export function fetchCategories() {
  return apiFetch<Category[]>("/products/categories");
}

export function createCategory(name: string) {
  return apiFetch<Category>("/products/categories", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function fetchBrands() {
  return apiFetch<Brand[]>("/products/brands");
}

export function createBrand(name: string) {
  return apiFetch<Brand>("/products/brands", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
}

export function fetchTaxClasses() {
  return apiFetch<TaxClass[]>("/products/tax-classes");
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

export function fetchReturnsSummary(params?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  const query = new URLSearchParams();
  if (params?.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params?.dateTo) query.set("dateTo", params.dateTo);
  return apiFetch<{
    summary: { totalReturns: number; totalRefunded: string };
    byDay: any[];
    byMethod: any[];
  }>(`/reports/returns-summary?${query.toString()}`);
}

export function fetchSalesByProduct(params?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  const query = new URLSearchParams();
  if (params?.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params?.dateTo) query.set("dateTo", params.dateTo);
  return apiFetch<{ data: any[] }>(`/reports/sales-by-product?${query.toString()}`);
}

export function fetchSalesByCashier(params?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  const query = new URLSearchParams();
  if (params?.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params?.dateTo) query.set("dateTo", params.dateTo);
  return apiFetch<{ data: any[] }>(`/reports/sales-by-cashier?${query.toString()}`);
}

export function fetchPaymentBreakdown(params?: {
  dateFrom?: string;
  dateTo?: string;
}) {
  const query = new URLSearchParams();
  if (params?.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params?.dateTo) query.set("dateTo", params.dateTo);
  return apiFetch<{ data: any[] }>(`/reports/payment-breakdown?${query.toString()}`);
}

export function fetchStockMovements(params?: {
  productId?: string;
  imei?: string;
  movementType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.productId) query.set("productId", params.productId);
  if (params?.imei) query.set("imei", params.imei);
  if (params?.movementType) query.set("movementType", params.movementType);
  if (params?.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params?.dateTo) query.set("dateTo", params.dateTo);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  return apiFetch<any[]>(`/reports/stock-movements?${query.toString()}`);
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

export interface CreateSupplierPayload {
  supplierCode: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTermsDays?: number;
  isActive?: boolean;
}

export function fetchSuppliers(params?: { q?: string; limit?: number }) {
  const query = new URLSearchParams();
  if (params?.q) query.set("q", params.q);
  query.set("limit", String(params?.limit ?? 100));
  return apiFetch<Supplier[]>(`/suppliers?${query.toString()}`);
}

export function createSupplier(payload: CreateSupplierPayload) {
  return apiFetch<Supplier>("/suppliers", {
    method: "POST",
    body: JSON.stringify(payload),
  });
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
  createdBy?: number;
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

export function updatePurchaseOrder(id: number, payload: CreatePoPayload) {
  return apiFetch<PurchaseOrder>(`/purchase-orders/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function deletePurchaseOrder(id: number) {
  return apiFetch<{ success: boolean; message: string }>(
    `/purchase-orders/${id}`,
    {
      method: "DELETE",
    },
  );
}

export function submitPurchaseOrder(id: number) {
  return apiFetch<PurchaseOrder>(`/purchase-orders/${id}/submit`, {
    method: "POST",
  });
}

export function approvePurchaseOrder(id: number) {
  return apiFetch<PurchaseOrder>(`/purchase-orders/${id}/approve`, {
    method: "POST",
  });
}

export function rejectPurchaseOrder(id: number, reason?: string) {
  return apiFetch<PurchaseOrder>(`/purchase-orders/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ reason }),
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
  actualUnitCost?: string | null;
  conditionStatus?: string;
  conditionNotes?: string | null;
  product?: Product;
  poItem?: PoItem;
  imeis?: {
    id: number;
    imeiUnitId?: number;
    imeiUnit?: { id: number; imei: string; status?: string };
  }[];
}

export interface GoodsReceipt {
  id: number;
  grnNumber: string;
  purchaseOrderId: number;
  receiveDate: string;
  receivedBy?: number;
  notes: string | null;
  supplierDoNumber?: string | null;
  carrierName?: string | null;
  trackingNumber?: string | null;
  createdAt: string;
  purchaseOrder?: {
    id: number;
    poNumber: string;
    supplier?: { id: number; name: string; address?: string | null; phone?: string | null };
  };
  receiver?: { id: number; fullName: string };
  items: GrItem[];
}

export interface CreateGrPayload {
  purchaseOrderId: number;
  receiveDate: string;
  notes?: string;
  supplierDoNumber?: string;
  carrierName?: string;
  trackingNumber?: string;
  items: {
    poItemId: number;
    productId: number;
    receivedQty: number;
    unitCost: number;
    actualUnitCost?: number;
    conditionStatus?: string;
    conditionNotes?: string;
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
  conditionGrade?: string | null;
  batteryHealth?: number | null;
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
  payload: {
    status?: string;
    location?: string;
    conditionGrade?: string;
    batteryHealth?: number | null;
  },
) {
  return apiFetch<ImeiUnit>(`/imei/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}



// ── Users & Roles ──────────────────────────────────────────────────
export interface AppUser {
  id: number;
  fullName: string;
  username: string;
  email: string | null;
  isActive: boolean;
  roleId: number;
  role?: { id: number; name: string; description: string | null };
  createdAt?: string;
}

export interface AppRole {
  id: number;
  name: string;
  description: string | null;
}

export function fetchUsers() {
  return apiFetch<AppUser[]>("/users");
}

export function fetchRoles() {
  return apiFetch<AppRole[]>("/users/roles");
}

export function fetchUser(id: number) {
  return apiFetch<AppUser>(`/users/${id}`);
}

export function createUser(payload: {
  fullName: string;
  username: string;
  email?: string;
  password: string;
  roleId: number;
}) {
  return apiFetch<AppUser>("/users", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateUser(
  id: number,
  payload: {
    fullName?: string;
    username?: string;
    email?: string;
    roleId?: number;
    isActive?: boolean;
  },
) {
  return apiFetch<AppUser>(`/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export function changePassword(
  id: number,
  currentPassword: string,
  newPassword: string,
) {
  return apiFetch<{ message: string }>(`/users/${id}/change-password`, {
    method: "POST",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export function resetUserPassword(id: number, newPassword: string) {
  return apiFetch<{ message: string }>(`/users/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ newPassword }),
  });
}

// ── File downloads (PDF / CSV) ─────────────────────────────────────
function authHeaders(): Record<string, string> {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function downloadReceiptPdf(saleId: number) {
  const res = await fetch(
    `${API_BASE_URL}${API_PREFIX}/sales/${saleId}/receipt/pdf`,
    { headers: { ...authHeaders() } },
  );
  if (!res.ok) throw new ApiError(res.status, "Failed to download PDF");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `receipt-${saleId}.pdf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadReportCsv(path: string, filename: string) {
  const res = await fetch(`${API_BASE_URL}${API_PREFIX}${path}`, {
    headers: { ...authHeaders() },
  });
  if (!res.ok) throw new ApiError(res.status, "Failed to download CSV");
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ── Settings ────────────────────────────────────────────────────────
export interface AppSettingsMap {
  STORE_NAME?: string;
  STORE_ADDRESS?: string;
  STORE_PHONE?: string;
  CURRENCY_CODE?: string;
  TAX_MODE?: "EXCLUSIVE" | "INCLUSIVE" | "NONE" | string;
  TAX_DEFAULT_RATE?: string;
  RECEIPT_PREFIX?: string;
  RECEIPT_FOOTER?: string;
  RETURN_WINDOW_DAYS?: string;
  MAX_DISCOUNT_PERCENT_CASHIER?: string;
  SESSION_TIMEOUT_MINUTES?: string;
  [key: string]: string | undefined;
}

export function fetchSettings() {
  return apiFetch<Record<string, string>>("/settings");
}

export function updateSettings(settings: { key: string; value: string }[]) {
  return apiFetch<Record<string, string>>("/settings", {
    method: "PATCH",
    body: JSON.stringify({ settings }),
  });
}

// ── Audit Logs ──────────────────────────────────────────────────────
export interface AuditLogItem {
  id: number;
  eventTime: string;
  userId: number | null;
  action: string;
  entityType: string;
  entityId: number | null;
  metadataJson: Record<string, any> | null;
  ipAddress: string | null;
  user?: {
    id: number;
    fullName: string;
    username: string;
    email: string | null;
    roleId: number;
    isActive: boolean;
  } | null;
}

export function fetchAuditLogs(params?: {
  userId?: number;
  action?: string;
  entityType?: string;
  dateFrom?: string;
  dateTo?: string;
  page?: number;
  limit?: number;
}) {
  const query = new URLSearchParams();
  if (params?.userId) query.set("userId", String(params.userId));
  if (params?.action) query.set("action", params.action);
  if (params?.entityType) query.set("entityType", params.entityType);
  if (params?.dateFrom) query.set("dateFrom", params.dateFrom);
  if (params?.dateTo) query.set("dateTo", params.dateTo);
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  return apiFetch<AuditLogItem[]>(`/audit-logs?${query.toString()}`);
}

