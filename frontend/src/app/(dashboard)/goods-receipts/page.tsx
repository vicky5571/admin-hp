"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GoodsReceipt,
  PoItem,
  PurchaseOrder,
  createGoodsReceipt,
  fetchGoodsReceipts,
  fetchPurchaseOrders,
} from "@/lib/api";
import CameraBarcodeScanner from "@/components/CameraBarcodeScanner";
import BulkImeiModal from "@/components/BulkImeiModal";
import PrintLabelsModal, { LabelItem } from "@/components/PrintLabelsModal";

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
  const [success, setSuccess] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [openPos, setOpenPos] = useState<PurchaseOrder[]>([]);
  const [selectedPo, setSelectedPo] = useState<PurchaseOrder | null>(null);
  const [receiveDate, setReceiveDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [notes, setNotes] = useState("");
  const [rows, setRows] = useState<ReceiveRow[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Scanner & Modal States
  const [scanningRowId, setScanningRowId] = useState<number | null>(null);
  const [bulkModalRowId, setBulkModalRowId] = useState<number | null>(null);
  const [printLabelsData, setPrintLabelsData] = useState<{
    isOpen: boolean;
    items: LabelItem[];
    title: string;
  }>({
    isOpen: false,
    items: [],
    title: "",
  });

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
    setSuccess("");
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

  const addImei = (poItemId: number, valueToAdd?: string) => {
    const row = rows.find((r) => r.poItem.id === poItemId);
    if (!row) return;
    const value = (valueToAdd ?? row.imeiInput).trim();
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
    setSuccess("");

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
      const res = await createGoodsReceipt({
        purchaseOrderId: selectedPo.id,
        receiveDate: new Date(receiveDate).toISOString(),
        notes: notes || undefined,
        items,
      });

      const newGr = res.data;
      setSuccess(`Goods Receipt #${newGr.grnNumber} created successfully!`);
      setShowForm(false);
      setSelectedPo(null);
      setRows([]);
      load(1);

      // Offer instant label printing for the newly created GR
      const labelItems: LabelItem[] = [];
      for (const grItem of newGr.items || []) {
        if (grItem.imeis && grItem.imeis.length > 0) {
          for (const imeiLink of grItem.imeis) {
            labelItems.push({
              sku: grItem.product?.sku || `PROD-${grItem.productId}`,
              name: grItem.product?.name || "Product",
              price: grItem.product?.sellingPrice
                ? parseFloat(grItem.product.sellingPrice)
                : undefined,
              imei: imeiLink.imeiUnit?.imei,
            });
          }
        } else {
          labelItems.push({
            sku: grItem.product?.sku || `PROD-${grItem.productId}`,
            name: grItem.product?.name || "Product",
            price: grItem.product?.sellingPrice
              ? parseFloat(grItem.product.sellingPrice)
              : undefined,
            quantity: grItem.receivedQty,
          });
        }
      }

      if (labelItems.length > 0) {
        setPrintLabelsData({
          isOpen: true,
          items: labelItems,
          title: `Print Labels — GRN ${newGr.grnNumber}`,
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create goods receipt",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered Receipts by search query
  const filteredReceipts = useMemo(() => {
    if (!searchQuery.trim()) return receipts;
    const q = searchQuery.toLowerCase();
    return receipts.filter((gr) => {
      const matchGrn = gr.grnNumber?.toLowerCase().includes(q);
      const matchPo = gr.purchaseOrder?.poNumber?.toLowerCase().includes(q);
      const matchSupplier = gr.purchaseOrder?.supplier?.name?.toLowerCase().includes(q);
      const matchItems = gr.items?.some((i) =>
        i.product?.sku?.toLowerCase().includes(q) ||
        i.product?.name?.toLowerCase().includes(q) ||
        i.imeis?.some((im) => im.imeiUnit?.imei?.toLowerCase().includes(q))
      );
      return matchGrn || matchPo || matchSupplier || matchItems;
    });
  }, [receipts, searchQuery]);

  // Active scanning row details
  const activeScanRow = rows.find((r) => r.poItem.id === scanningRowId);
  const activeBulkRow = rows.find((r) => r.poItem.id === bulkModalRowId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Goods Receipts (GRN)
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Receive incoming stock against Purchase Orders, register IMEI serials, and print barcode labels.
          </p>
        </div>
        <button
          onClick={() => openForm()}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Receive Stock Against PO
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="text-emerald-600 hover:text-emerald-800 font-bold">
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700 border border-red-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error}</span>
          </div>
          <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Receive Stock Intake Card */}
      {showForm && (
        <div className="rounded-xl bg-white p-5 sm:p-6 shadow-md border border-blue-100 ring-1 ring-blue-50 space-y-5">
          <div className="flex items-center justify-between border-b border-gray-100 pb-3">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <span>Receive Stock Against Purchase Order</span>
              {selectedPo && (
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {selectedPo.poNumber}
                </span>
              )}
            </h2>
            <button
              onClick={() => setShowForm(false)}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold"
            >
              &times;
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Select Purchase Order <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedPo?.id ? String(selectedPo.id) : ""}
                onChange={(e) => selectPo(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              >
                <option value="">Choose an open PO...</option>
                {openPos.map((po) => (
                  <option key={po.id} value={po.id}>
                    {po.poNumber} — {po.supplier?.name} ({po.status})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Receive Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={receiveDate}
                onChange={(e) => setReceiveDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Delivery / DO Notes
              </label>
              <input
                type="text"
                placeholder="e.g. Courier Tracking / Delivery Note #889"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {selectedPo && rows.length === 0 && (
            <div className="py-6 text-center text-sm text-gray-500 bg-gray-50 rounded-xl border border-gray-200">
              All items in PO #{selectedPo.poNumber} have already been received.
            </div>
          )}

          {rows.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-gray-700 uppercase">
                Items to Receive
              </div>
              {rows.map((row) => {
                const outstanding = row.poItem.orderedQty - row.poItem.receivedQty;
                const isSerialized = row.poItem.product?.productType === "SERIALIZED";
                const qtyNum = Number(row.receivedQty) || 0;

                return (
                  <div
                    key={row.poItem.id}
                    className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm text-gray-900">
                          {row.poItem.product
                            ? `${row.poItem.product.sku} — ${row.poItem.product.name}`
                            : `Product #${row.poItem.productId}`}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Ordered: <span className="font-medium text-gray-700">{row.poItem.orderedQty}</span> | Already Received: <span className="font-medium text-gray-700">{row.poItem.receivedQty}</span> | Outstanding: <span className="font-semibold text-blue-600">{outstanding}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-600">
                          Receive Qty:
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={outstanding}
                          value={row.receivedQty}
                          onChange={(e) => {
                            const val = Math.min(
                              outstanding,
                              Math.max(0, Number(e.target.value)),
                            );
                            updateRow(row.poItem.id, {
                              receivedQty: String(val),
                            });
                          }}
                          className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white text-right font-medium focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Serialized IMEI Scanner & Intake Area */}
                    {isSerialized && qtyNum > 0 && (
                      <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-700">
                              IMEI Serials:
                            </span>
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                row.imeis.length === qtyNum
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {row.imeis.length} of {qtyNum} registered
                            </span>
                          </div>

                          {/* Quick Tool Buttons: Camera Scan & Bulk Paste */}
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setScanningRowId(row.poItem.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              <span>Scan with Phone / Cam</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setBulkModalRowId(row.poItem.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <span>Bulk Paste</span>
                            </button>
                          </div>
                        </div>

                        {/* List of Registered IMEIs */}
                        {row.imeis.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-gray-50 rounded-lg border border-gray-100">
                            {row.imeis.map((imei) => (
                              <span
                                key={imei}
                                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-mono font-medium text-blue-700 border border-blue-200 shadow-2xs"
                              >
                                {imei}
                                <button
                                  type="button"
                                  onClick={() => removeImei(row.poItem.id, imei)}
                                  className="text-red-400 hover:text-red-600 font-bold ml-0.5"
                                >
                                  &times;
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        {/* Fast Single Input Field */}
                        {row.imeis.length < qtyNum && (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Scan or type 15-digit IMEI, press Enter..."
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
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => addImei(row.poItem.id)}
                              className="rounded-lg bg-gray-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-gray-800"
                            >
                              Add IMEI
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-lg px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={submitting || !selectedPo || rows.length === 0}
              className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
            >
              {submitting ? "Processing..." : "Confirm & Create Goods Receipt"}
            </button>
          </div>
        </div>
      )}

      {/* Search Bar & Filter */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            placeholder="Search GRN, PO#, Supplier, SKU, or IMEI..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 rounded-lg border border-gray-300 text-xs focus:border-blue-500 focus:outline-none"
          />
        </div>
        <span className="text-xs text-gray-500">
          Showing <strong>{filteredReceipts.length}</strong> receipt(s)
        </span>
      </div>

      {/* Receipts History Table */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/75 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3.5">GRN Number</th>
                <th className="px-4 py-3.5">PO Number</th>
                <th className="px-4 py-3.5">Supplier</th>
                <th className="px-4 py-3.5">Receive Date</th>
                <th className="px-4 py-3.5 text-center">Items</th>
                <th className="px-4 py-3.5">Received By</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading goods receipts...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && filteredReceipts.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No goods receipts found.
                  </td>
                </tr>
              )}
              {filteredReceipts.map((gr) => (
                <ReceiptTableRow
                  key={gr.id}
                  gr={gr}
                  expanded={expanded === gr.id}
                  onToggle={() => setExpanded(expanded === gr.id ? null : gr.id)}
                  onPrintLabels={() => {
                    const labelItems: LabelItem[] = [];
                    for (const grItem of gr.items || []) {
                      if (grItem.imeis && grItem.imeis.length > 0) {
                        for (const imeiLink of grItem.imeis) {
                          labelItems.push({
                            sku: grItem.product?.sku || `PROD-${grItem.productId}`,
                            name: grItem.product?.name || "Product",
                            price: grItem.product?.sellingPrice
                              ? parseFloat(grItem.product.sellingPrice)
                              : undefined,
                            imei: imeiLink.imeiUnit?.imei,
                          });
                        }
                      } else {
                        labelItems.push({
                          sku: grItem.product?.sku || `PROD-${grItem.productId}`,
                          name: grItem.product?.name || "Product",
                          price: grItem.product?.sellingPrice
                            ? parseFloat(grItem.product.sellingPrice)
                            : undefined,
                          quantity: grItem.receivedQty,
                        });
                      }
                    }
                    setPrintLabelsData({
                      isOpen: true,
                      items: labelItems,
                      title: `Print Labels — GRN ${gr.grnNumber}`,
                    });
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {meta.pageCount > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Page {meta.page} of {meta.pageCount}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(meta.page - 1)}
              disabled={meta.page <= 1}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => load(meta.page + 1)}
              disabled={meta.page >= meta.pageCount}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner Modal */}
      {scanningRowId !== null && activeScanRow && (
        <CameraBarcodeScanner
          isOpen={true}
          onClose={() => setScanningRowId(null)}
          onScan={(code) => addImei(activeScanRow.poItem.id, code)}
          title={`Scan IMEI: ${activeScanRow.poItem.product?.name || activeScanRow.poItem.product?.sku}`}
          subtitle={`Required: ${activeScanRow.receivedQty} IMEIs`}
          expectedCount={Number(activeScanRow.receivedQty)}
          currentCount={activeScanRow.imeis.length}
        />
      )}

      {/* Bulk IMEI Paste Modal */}
      {bulkModalRowId !== null && activeBulkRow && (
        <BulkImeiModal
          isOpen={true}
          onClose={() => setBulkModalRowId(null)}
          onApply={(newImeis) => {
            const combined = Array.from(
              new Set([...activeBulkRow.imeis, ...newImeis]),
            );
            updateRow(activeBulkRow.poItem.id, {
              imeis: combined,
            });
          }}
          productSku={activeBulkRow.poItem.product?.sku}
          productName={activeBulkRow.poItem.product?.name}
          targetQty={Number(activeBulkRow.receivedQty)}
          existingImeis={activeBulkRow.imeis}
        />
      )}

      {/* Print Barcode Labels Modal */}
      <PrintLabelsModal
        isOpen={printLabelsData.isOpen}
        onClose={() => setPrintLabelsData((prev) => ({ ...prev, isOpen: false }))}
        items={printLabelsData.items}
        title={printLabelsData.title}
      />
    </div>
  );
}

function ReceiptTableRow({
  gr,
  expanded,
  onToggle,
  onPrintLabels,
}: {
  gr: GoodsReceipt;
  expanded: boolean;
  onToggle: () => void;
  onPrintLabels: () => void;
}) {
  return (
    <>
      <tr className="hover:bg-gray-50/80 transition-colors">
        <td className="px-4 py-3.5">
          <button
            onClick={onToggle}
            className="font-mono font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1.5"
          >
            <svg
              className={`w-3.5 h-3.5 transition-transform ${expanded ? "rotate-90" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span>{gr.grnNumber}</span>
          </button>
        </td>
        <td className="px-4 py-3.5 font-mono text-gray-700 text-xs">
          {gr.purchaseOrder?.poNumber ?? `#${gr.purchaseOrderId}`}
        </td>
        <td className="px-4 py-3.5 font-medium text-gray-900">
          {gr.purchaseOrder?.supplier?.name ?? "-"}
        </td>
        <td className="px-4 py-3.5 text-gray-600 text-xs">
          {gr.receiveDate ? new Date(gr.receiveDate).toLocaleDateString() : "-"}
        </td>
        <td className="px-4 py-3.5 text-center text-gray-700 font-medium">
          {gr.items?.length ?? 0}
        </td>
        <td className="px-4 py-3.5 text-xs text-gray-600">
          {gr.receiver?.fullName ?? `#${gr.receivedBy}`}
        </td>
        <td className="px-4 py-3.5 text-right">
          <button
            type="button"
            onClick={onPrintLabels}
            className="inline-flex items-center gap-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-800 px-2.5 py-1 text-xs font-semibold shadow-2xs transition-colors"
          >
            <svg className="w-3.5 h-3.5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Labels</span>
          </button>
        </td>
      </tr>

      {/* Expanded GRN Item Breakdown with IMEIs */}
      {expanded && (
        <tr className="bg-gray-50/90 border-y border-gray-200">
          <td colSpan={7} className="px-6 py-4">
            <div className="space-y-3">
              {gr.notes && (
                <div className="bg-white p-2.5 rounded-lg border border-gray-200 text-xs text-gray-700">
                  <span className="font-semibold text-gray-900 mr-1">Notes:</span>
                  {gr.notes}
                </div>
              )}

              <div className="rounded-lg bg-white border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-100 text-left text-gray-600 font-semibold uppercase">
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3 text-center">Received Qty</th>
                      <th className="py-2 px-3 text-right">Unit Cost</th>
                      <th className="py-2 px-3 text-left">IMEI Numbers</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {gr.items?.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="py-2 px-3 font-medium text-gray-900">
                          {item.product
                            ? `${item.product.sku} — ${item.product.name}`
                            : `Product #${item.productId}`}
                        </td>
                        <td className="py-2 px-3 text-center font-semibold text-emerald-700">
                          {item.receivedQty}
                        </td>
                        <td className="py-2 px-3 text-right text-gray-600 font-mono">
                          IDR {parseFloat(item.unitCost).toLocaleString()}
                        </td>
                        <td className="py-2 px-3">
                          {item.imeis && item.imeis.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-lg">
                              {item.imeis.map((im) => (
                                <span
                                  key={im.id}
                                  className="font-mono text-[11px] bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200"
                                >
                                  {im.imeiUnit?.imei ?? `#${im.imeiUnitId}`}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Non-serialized</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
