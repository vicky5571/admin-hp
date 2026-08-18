"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GoodsReceipt,
  PoItem,
  PurchaseOrder,
  createGoodsReceipt,
  fetchGoodsReceipts,
  fetchPurchaseOrders,
} from "@/lib/api";

interface ReceiveRow {
  poItem: PoItem;
  receivedQty: string;
  imeis: string[];
  imeiInput: string;
}

export default function GoodsReceiptsPage() {
  const [receipts, setReceipts] = useState<GoodsReceipt[]>([]);
  const [meta, setMeta] = useState<{ page: number; pageCount: number }>({
    page: 1,
    pageCount: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [openPos, setOpenPos] = useState<PurchaseOrder[]>([]);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [receiveDate, setReceiveDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ReceiveRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await fetchGoodsReceipts({ page, limit: 20 });
      setReceipts(res.data ?? []);
      setMeta(((res.meta ?? {}) as any) ?? { page: 1, pageCount: 1 });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load receipts");
    } finally {
      setLoading(false);
    }
  }, []);

  const openForm = useCallback(async (autoPoId?: string) => {
    setShowForm(true);
    setError("");
    setSelectedPo(null);
    setRows([]);
    try {
      const [approved, submitted, partial] = await Promise.all([
        fetchPurchaseOrders({ status: "APPROVED", limit: 100 }),
        fetchPurchaseOrders({ status: "SUBMITTED", limit: 100 }),
        fetchPurchaseOrders({ status: "PARTIALLY_RECEIVED", limit: 100 }),
      ]);
      const list = [
        ...(approved.data ?? []),
        ...(submitted.data ?? []),
        ...(partial.data ?? []),
      ];
      setOpenPos(list);

      if (autoPoId) {
        const match = list.find((p) => String(p.id) === autoPoId);
        if (match) {
          setSelectedPo(match);
          setRows(
            (match.items ?? [])
              .filter((i) => i.orderedQty - i.receivedQty > 0)
              .map((i) => ({
                poItem: i,
                receivedQty: String(i.orderedQty - i.receivedQty),
                imeis: [],
                imeiInput: "",
              })),
          );
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load POs");
    }
  }, []);

  useEffect(() => {
    load(1);
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const urlPoId = params.get("poId");
      if (urlPoId) {
        openForm(urlPoId);
      }
    }
  }, [load, openForm]);

  const selectPo = (poId: string) => {
    const po = openPos.find((p) => String(p.id) === poId) ?? null;
    setSelectedPo(po);
    setRows(
      (po?.items ?? [])
        .filter((i) => i.orderedQty - i.receivedQty > 0)
        .map((i) => ({
          poItem: i,
          receivedQty: String(i.orderedQty - i.receivedQty),
          imeis: [],
          imeiInput: "",
        })),
    );
  };

  const updateRow = (poItemId: number, patch: Partial<ReceiveRow>) => {
    setRows((prev) =>
      prev.map((r) =>
        r.poItem.id === poItemId ? { ...r, ...patch } : r,
      ),
    );
  };

  const addImei = (poItemId: number) => {
    const row = rows.find((r) => r.poItem.id === poItemId);
    if (!row) return;
    const value = row.imeiInput.trim();
    if (!value || row.imeis.includes(value)) {
      updateRow(poItemId, { imeiInput: "" });
      return;
    }
    updateRow(poItemId, { imeis: [...row.imeis, value], imeiInput: "" });
  };

  const removeImei = (poItemId: number, imei: string) => {
    const row = rows.find((r) => r.poItem.id === poItemId);
    if (!row) return;
    updateRow(poItemId, { imeis: row.imeis.filter((v) => v !== imei) });
  };

  const handleCreate = async () => {
    if (!selectedPo) return;
    setError("");

    const items = rows
      .filter((r) => Number(r.receivedQty) > 0)
      .map((r) => ({
        poItemId: r.poItem.id,
        productId: r.poItem.productId,
        receivedQty: Number(r.receivedQty),
        unitCost: parseFloat(r.poItem.unitCost),
        imeis: r.imeis.length > 0 ? r.imeis : undefined,
      }));

    if (items.length === 0) {
      setError("Enter received quantity for at least one item");
      return;
    }

    for (const r of rows.filter((r) => Number(r.receivedQty) > 0)) {
      if (r.poItem.product?.productType === "SERIALIZED") {
        const qty = Number(r.receivedQty);
        if (r.imeis.length !== qty) {
          setError(
            `${r.poItem.product.sku} requires exactly ${qty} IMEI(s), got ${r.imeis.length}`,
          );
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      await createGoodsReceipt({
        purchaseOrderId: selectedPo.id,
        receiveDate: new Date(receiveDate).toISOString(),
        notes: notes || undefined,
        items,
      });
      setShowForm(false);
      setNotes("");
      load(1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to receive stock");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Goods Receipts</h1>
        <button
          onClick={() => openForm()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Receive Stock
        </button>
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      {showForm && (
        <div className="mb-4 sm:mb-6 rounded-xl bg-white p-4 sm:p-5 shadow-sm border border-gray-200">
          <h2 className="font-semibold text-gray-900 mb-3 sm:mb-4">
            Receive Stock Against PO
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4 mb-3 sm:mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Order
              </label>
              <select
                value={selectedPo ? String(selectedPo.id) : ""}
                onChange={(e) => selectPo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Select PO...</option>
                {openPos.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.poNumber} — {po.supplier?.name}
                  </option>
                ))}
              </select>
              {openPos.length === 0 && (
                <p className="mt-1 text-xs text-gray-400">
                  No submitted or partially received POs available
                </p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Receive Date
              </label>
              <input
                type="date"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
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

          {selectedPo && rows.length > 0 && (
            <div className="space-y-4 mb-4">
              {rows.map((row) => {
                const serialized =
                  row.poItem.product?.productType === "SERIALIZED";
                const outstanding =
                  row.poItem.orderedQty - row.poItem.receivedQty;
                return (
                  <div
                    key={row.poItem.id}
                    className="rounded-lg border border-gray-200 p-3"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">
                          {row.poItem.product
                            ? `${row.poItem.product.sku} — ${row.poItem.product.name}`
                            : `Product ${row.poItem.productId}`}
                        </p>
                        <p className="text-xs text-gray-500">
                          Outstanding: {outstanding} | Unit cost: IDR{" "}
                          {parseFloat(row.poItem.unitCost).toLocaleString()}
                          {serialized && (
                            <span className="ml-2 rounded bg-purple-100 px-1.5 py-0.5 text-purple-700">
                              IMEI required
                            </span>
                          )}
                        </p>
                      </div>
                      <input
                        type="number"
                        min={0}
                        max={outstanding}
                        value={row.receivedQty}
                        onChange={(e) =>
                          updateRow(row.poItem.id, {
                            receivedQty: e.target.value,
                          })
                        }
                        className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {serialized && Number(row.receivedQty) > 0 && (
                      <div>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={row.imeiInput}
                            onChange={(e) =>
                              updateRow(row.poItem.id, {
                                imeiInput: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                addImei(row.poItem.id);
                              }
                            }}
                            placeholder="Scan or type IMEI, press Enter"
                            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                          />
                          <button
                            onClick={() => addImei(row.poItem.id)}
                            className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium hover:bg-gray-200"
                          >
                            Add
                          </button>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {row.imeis.map((imei) => (
                            <span
                              key={imei}
                              className="inline-flex items-center gap-1 rounded bg-gray-100 px-2 py-1 text-xs font-mono"
                            >
                              {imei}
                              <button
                                onClick={() =>
                                  removeImei(row.poItem.id, imei)
                                }
                                className="text-red-500 hover:text-red-700"
                              >
                                x
                              </button>
                            </span>
                          ))}
                          <span className="text-xs text-gray-500 self-center">
                            {row.imeis.length} / {Number(row.receivedQty)} IMEIs
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {selectedPo && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleCreate}
                disabled={submitting || rows.length === 0}
                className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
              >
                {submitting ? "Receiving..." : "Confirm Receipt"}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      )}

      <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
        <table className="w-full text-sm whitespace-nowrap">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">GRN Number</th>
              <th className="px-4 py-3 font-medium">PO Number</th>
              <th className="px-4 py-3 font-medium">Receive Date</th>
              <th className="px-4 py-3 font-medium">Received By</th>
              <th className="px-4 py-3 font-medium">Items</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && receipts.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                  No goods receipts yet
                </td>
              </tr>
            )}
            {receipts.map((gr) => (
              <ReceiptRows
                key={gr.id}
                gr={gr}
                expanded={expanded === gr.id}
                onToggle={() => setExpanded(expanded === gr.id ? null : gr.id)}
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

const imeiStatusColor: Record<string, string> = {
  IN_STOCK: "bg-green-100 text-green-700",
  SOLD: "bg-blue-100 text-blue-700",
  RETURNED: "bg-amber-100 text-amber-700",
  DEFECTIVE: "bg-red-100 text-red-600",
  RESERVED: "bg-purple-100 text-purple-700",
};

function ReceiptRows({
  gr,
  expanded,
  onToggle,
}: {
  gr: GoodsReceipt;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <>
      <tr className="border-b border-gray-100 hover:bg-gray-50">
        <td className="px-4 py-3">
          <button
            onClick={onToggle}
            className="font-medium text-blue-600 hover:underline"
          >
            {gr.grnNumber}
          </button>
        </td>
        <td className="px-4 py-3">
          {gr.purchaseOrder?.poNumber ?? "-"}
        </td>
        <td className="px-4 py-3">
          {new Date(gr.receiveDate).toLocaleDateString()}
        </td>
        <td className="px-4 py-3">{gr.receiver?.fullName ?? "-"}</td>
        <td className="px-4 py-3">{gr.items.length}</td>
      </tr>
      {expanded && (
        <tr className="bg-gray-50">
          <td colSpan={5} className="px-6 py-3">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="text-left text-gray-500">
                  <th className="py-1 pr-4 font-medium">Product</th>
                  <th className="py-1 pr-4 font-medium">Received</th>
                  <th className="py-1 pr-4 font-medium">Unit Cost</th>
                  <th className="py-1 font-medium">IMEIs</th>
                </tr>
              </thead>
              <tbody>
                {gr.items.map((item) => (
                  <tr key={item.id} className="border-t border-gray-200">
                    <td className="py-1.5 pr-4">
                      {item.product
                        ? `${item.product.sku} — ${item.product.name}`
                        : item.productId}
                    </td>
                    <td className="py-1.5 pr-4">{item.receivedQty}</td>
                    <td className="py-1.5 pr-4">
                      IDR {parseFloat(item.unitCost).toLocaleString()}
                    </td>
                    <td className="py-1.5">
                      <div className="flex flex-wrap gap-1">
                        {(item.imeis ?? []).map((link) => (
                          <span
                            key={link.id}
                            className={`rounded px-1.5 py-0.5 text-xs font-mono ${
                              imeiStatusColor[
                                link.imeiUnit?.status ?? "IN_STOCK"
                              ] ?? "bg-green-100 text-green-700"
                            }`}
                          >
                            {link.imeiUnit?.imei ?? link.id}
                          </span>
                        ))}
                        {(item.imeis ?? []).length === 0 && "-"}
                      </div>
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
