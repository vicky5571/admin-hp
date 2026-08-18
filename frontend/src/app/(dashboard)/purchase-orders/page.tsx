"use client";

import { useCallback, useEffect, useState } from "react";
import {
  PurchaseOrder,
  Supplier,
  cancelPurchaseOrder,
  createPurchaseOrder,
  fetchProducts,
  fetchPurchaseOrders,
  fetchSuppliers,
  submitPurchaseOrder,
} from "@/lib/api";

const PO_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "PARTIALLY_RECEIVED",
  "COMPLETED",
  "CANCELLED",
];

const statusColor: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  SUBMITTED: "bg-blue-100 text-blue-700",
  PARTIALLY_RECEIVED: "bg-amber-100 text-amber-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-red-100 text-red-600",
};

interface ItemRow {
  productId: string;
  orderedQty: string;
  unitCost: string;
}

const emptyRow: ItemRow = { productId: "", orderedQty: "1", unitCost: "" };

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [meta, setMeta] = useState<{ page: number; pageCount: number }>({
    page: 1,
    pageCount: 1,
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [orderDate, setOrderDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [expectedDate, setExpectedDate] = useState("");
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ItemRow[]>([{ ...emptyRow }]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetchPurchaseOrders({
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setOrders(res.data ?? []);
      setMeta(((res.meta ?? {}) as any) ?? { page: 1, pageCount: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load POs");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load(1);
  }, [load]);

  const openForm = async () => {
    setShowForm(true);
    setError("");
    try {
      const [supRes, prodRes] = await Promise.all([
        fetchSuppliers(),
        fetchProducts({ limit: 100 }),
      ]);
      setSuppliers(
        (supRes.data ?? []).filter((s) => s.isActive),
      );
      setProducts(prodRes.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load form data");
    }
  };

  const updateRow = (index: number, patch: Partial<ItemRow>) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  };

  const handleCreate = async () => {
    setError("");
    const items = rows
      .filter((r) => r.productId)
      .map((r) => ({
        productId: Number(r.productId),
        orderedQty: Number(r.orderedQty),
        unitCost: Number(r.unitCost || 0),
      }));

    if (!supplierId || items.length === 0 || !orderDate) {
      setError("Supplier, order date, and at least one item are required");
      return;
    }

    setSubmitting(true);
    try {
      await createPurchaseOrder({
        supplierId: Number(supplierId),
        orderDate,
        expectedDate: expectedDate || undefined,
        notes: notes || undefined,
        items,
      });
      setShowForm(false);
      setSupplierId("");
      setExpectedDate("");
      setNotes("");
      setRows([{ ...emptyRow }]);
      load(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create PO");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAction = async (id: number, action: "submit" | "cancel") => {
    setError("");
    try {
      if (action === "submit") {
        await submitPurchaseOrder(id);
      } else {
        if (!confirm("Cancel this purchase order?")) return;
        await cancelPurchaseOrder(id);
      }
      load(meta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    }
  };

  const poTotal = (po: PurchaseOrder) =>
    po.items.reduce(
      (sum, i) => sum + parseFloat(i.unitCost) * i.orderedQty,
      0,
    );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
        <button
          onClick={openForm}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          New Purchase Order
        </button>
      </div>

      <div className="mb-4 flex items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          {PO_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-4 sm:mb-6 rounded-xl bg-white p-4 sm:p-5 shadow-sm border border-gray-200">
          <h2 className="font-semibold text-gray-900 mb-3 sm:mb-4">
            New Purchase Order
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier
              </label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Order Date
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Expected Date
              </label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="space-y-2 mb-4">
            {rows.map((row, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={row.productId}
                  onChange={(e) => {
                    const prod = products.find(
                      (p) => String(p.id) === e.target.value,
                    );
                    updateRow(i, {
                      productId: e.target.value,
                      unitCost: prod ? String(parseFloat(prod.costPrice)) : row.unitCost,
                    });
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Select product...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} — {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={row.orderedQty}
                  onChange={(e) => updateRow(i, { orderedQty: e.target.value })}
                  className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Qty"
                />
                <input
                  type="number"
                  min={0}
                  value={row.unitCost}
                  onChange={(e) => updateRow(i, { unitCost: e.target.value })}
                  className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  placeholder="Unit cost"
                />
                <button
                  onClick={() =>
                    setRows((prev) => prev.filter((_, j) => j !== i))
                  }
                  className="text-red-500 text-sm hover:text-red-700 px-2"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setRows((prev) => [...prev, { ...emptyRow }])}
              className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium hover:bg-gray-200"
            >
              Add Item
            </button>
            <button
              onClick={handleCreate}
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? "Creating..." : "Create PO (Draft)"}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">PO Number</th>
              <th className="px-4 py-3 font-medium">Supplier</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Order Date</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Total Cost</th>
              <th className="px-4 py-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && orders.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No purchase orders
                </td>
              </tr>
            )}
            {orders.map((po) => (
              <FragmentRows
                key={po.id}
                po={po}
                expanded={expanded === po.id}
                onToggle={() =>
                  setExpanded(expanded === po.id ? null : po.id)
                }
                onAction={handleAction}
                total={poTotal(po)}
              />
            ))}
          </tbody>
        </table>
        </div>
      </div>

      {meta.pageCount > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={() => load(meta.page - 1)}
            disabled={meta.page <= 1}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-gray-500">
            Page {meta.page} of {meta.pageCount}
          </span>
          <button
            onClick={() => load(meta.page + 1)}
            disabled={meta.page >= meta.pageCount}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

function FragmentRows({
  po,
  expanded,
  onToggle,
  onAction,
  total,
}: {
  po: PurchaseOrder;
  expanded: boolean;
  onToggle: () => void;
  onAction: (id: number, action: "submit" | "cancel") => void;
  total: number;
}) {
  const cancellable =
    po.status !== "COMPLETED" && po.status !== "CANCELLED";
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-3">
          <button
            onClick={onToggle}
            className="font-medium text-blue-600 hover:underline"
          >
            {po.poNumber}
          </button>
        </td>
        <td className="px-4 py-3">{po.supplier?.name ?? "-"}</td>
        <td className="px-4 py-3">
          <span
            className={`rounded px-1.5 py-0.5 text-xs font-medium ${statusColor[po.status] ?? "bg-gray-100 text-gray-700"}`}
          >
            {po.status.replace(/_/g, " ")}
          </span>
        </td>
        <td className="px-4 py-3">{po.orderDate?.slice(0, 10)}</td>
        <td className="px-4 py-3">{po.items.length}</td>
        <td className="px-4 py-3">IDR {total.toLocaleString()}</td>
        <td className="px-4 py-3 space-x-3">
          {po.status === "DRAFT" && (
            <button
              onClick={() => onAction(po.id, "submit")}
              className="text-blue-600 hover:underline"
            >
              Submit
            </button>
          )}
          {cancellable && (
            <button
              onClick={() => onAction(po.id, "cancel")}
              className="text-red-500 hover:underline"
            >
              Cancel
            </button>
          )}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50">
          <td colSpan={7} className="px-6 py-3">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1 pr-4 font-medium">Product</th>
                  <th className="py-1 pr-4 font-medium">Ordered</th>
                  <th className="py-1 pr-4 font-medium">Received</th>
                  <th className="py-1 pr-4 font-medium">Outstanding</th>
                  <th className="py-1 font-medium">Unit Cost</th>
                </tr>
              </thead>
              <tbody>
                {po.items.map((item) => (
                  <tr key={item.id} className="border-t border-gray-200">
                    <td className="py-1.5 pr-4">
                      {item.product
                        ? `${item.product.sku} — ${item.product.name}`
                        : item.productId}
                    </td>
                    <td className="py-1.5 pr-4">{item.orderedQty}</td>
                    <td className="py-1.5 pr-4">{item.receivedQty}</td>
                    <td className="py-1.5 pr-4">
                      {item.orderedQty - item.receivedQty}
                    </td>
                    <td className="py-1.5">
                      IDR {parseFloat(item.unitCost).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </td>
        </tr>
      )}
    </>
  );
}
