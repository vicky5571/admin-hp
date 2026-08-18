"use client";

import { useCallback, useEffect, useState } from "react";
import {
  GoodsReceipt,
  PoItem,
  PurchaseOrder,
  Supplier,
  approvePurchaseOrder,
  cancelPurchaseOrder,
  createGoodsReceipt,
  createPurchaseOrder,
  createSupplier,
  deletePurchaseOrder,
  fetchProducts,
  fetchPurchaseOrders,
  fetchSuppliers,
  rejectPurchaseOrder,
  submitPurchaseOrder,
  updatePurchaseOrder,
} from "@/lib/api";
import CameraBarcodeScanner from "@/components/CameraBarcodeScanner";
import BulkImeiModal from "@/components/BulkImeiModal";
import PrintLabelsModal, { LabelItem } from "@/components/PrintLabelsModal";

const PO_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "APPROVED",
  "REJECTED",
  "PARTIALLY_RECEIVED",
  "COMPLETED",
  "CANCELLED",
];

const statusColor: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 border-gray-200",
  SUBMITTED: "bg-blue-100 text-blue-800 border-blue-200",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200",
  REJECTED: "bg-rose-100 text-rose-800 border-rose-200",
  PARTIALLY_RECEIVED: "bg-amber-100 text-amber-800 border-amber-200",
  COMPLETED: "bg-green-100 text-green-800 border-green-200",
  CANCELLED: "bg-slate-100 text-slate-500 border-slate-200",
};

interface ItemRow {
  productId: string;
  orderedQty: string;
  unitCost: string;
}

const emptyRow: ItemRow = { productId: "", orderedQty: "1", unitCost: "" };

interface ReceiveRow {
  poItem: PoItem;
  receivedQty: string;
  imeis: string[];
  imeiInput: string;
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [meta, setMeta] = useState<{ page: number; pageCount: number }>({
    page: 1,
    pageCount: 1,
  });
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);

  // Form State (Create & Edit PO)
  const [showForm, setShowForm] = useState(false);
  const [editingPoId, setEditingPoId] = useState<number | null>(null);
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

  // Quick Add Supplier Modal State
  const [showAddSupplierModal, setShowAddSupplierModal] = useState(false);
  const [newSupplierCode, setNewSupplierCode] = useState("");
  const [newSupplierName, setNewSupplierName] = useState("");
  const [newSupplierContact, setNewSupplierContact] = useState("");
  const [newSupplierPhone, setNewSupplierPhone] = useState("");
  const [newSupplierEmail, setNewSupplierEmail] = useState("");
  const [newSupplierAddress, setNewSupplierAddress] = useState("");
  const [newSupplierTerms, setNewSupplierTerms] = useState("0");
  const [supplierSubmitting, setSupplierSubmitting] = useState(false);
  const [supplierError, setSupplierError] = useState("");

  // Reject Modal State
  const [rejectingPo, setRejectingPo] = useState<PurchaseOrder | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  // Receive Items Modal State
  const [receivePo, setReceivePo] = useState<PurchaseOrder | null>(null);
  const [receiveDate, setReceiveDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [receiveNotes, setReceiveNotes] = useState("");
  const [receiveRows, setReceiveRows] = useState<ReceiveRow[]>([]);
  const [receiveSubmitting, setReceiveSubmitting] = useState(false);
  const [receiveError, setReceiveError] = useState("");

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

  const load = useCallback(
    async (page = 1) => {
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
    },
    [statusFilter],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const loadDropdownData = async () => {
    try {
      const [supRes, prodRes] = await Promise.all([
        fetchSuppliers(),
        fetchProducts({ limit: 100 }),
      ]);
      setSuppliers((supRes.data ?? []).filter((s) => s.isActive));
      setProducts(prodRes.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load form options");
    }
  };

  const openCreateForm = async () => {
    setEditingPoId(null);
    setSupplierId("");
    setOrderDate(new Date().toISOString().slice(0, 10));
    setExpectedDate("");
    setNotes("");
    setRows([{ ...emptyRow }]);
    setShowForm(true);
    setError("");
    setSuccess("");
    await loadDropdownData();
  };

  const openEditForm = async (po: PurchaseOrder) => {
    setEditingPoId(po.id);
    setSupplierId(String(po.supplierId));
    setOrderDate(po.orderDate ? po.orderDate.slice(0, 10) : "");
    setExpectedDate(po.expectedDate ? po.expectedDate.slice(0, 10) : "");
    setNotes(po.notes || "");
    setRows(
      po.items.map((i) => ({
        productId: String(i.productId),
        orderedQty: String(i.orderedQty),
        unitCost: String(parseFloat(i.unitCost) || 0),
      })),
    );
    setShowForm(true);
    setError("");
    setSuccess("");
    await loadDropdownData();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const updateRow = (index: number, patch: Partial<ItemRow>) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, ...patch } : r)),
    );
  };

  const handleSavePo = async () => {
    setError("");
    const items = rows
      .filter((r) => r.productId)
      .map((r) => ({
        productId: Number(r.productId),
        orderedQty: Number(r.orderedQty),
        unitCost: Number(r.unitCost || 0),
      }));

    if (!supplierId || items.length === 0 || !orderDate) {
      setError("Supplier, order date, and at least one valid item are required");
      return;
    }

    setSubmitting(true);
    try {
      if (editingPoId) {
        await updatePurchaseOrder(editingPoId, {
          supplierId: Number(supplierId),
          orderDate,
          expectedDate: expectedDate || undefined,
          notes: notes || undefined,
          items,
        });
        setSuccess(`Purchase Order #${editingPoId} updated successfully`);
      } else {
        await createPurchaseOrder({
          supplierId: Number(supplierId),
          orderDate,
          expectedDate: expectedDate || undefined,
          notes: notes || undefined,
          items,
        });
        setSuccess("New Purchase Order created in Draft status");
      }
      setShowForm(false);
      setEditingPoId(null);
      load(meta.page);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : editingPoId
            ? "Failed to update PO"
            : "Failed to create PO",
      );
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Add Supplier Handler
  const openSupplierModal = () => {
    const randomCode = `SUP-${Math.floor(1000 + Math.random() * 9000)}`;
    setNewSupplierCode(randomCode);
    setNewSupplierName("");
    setNewSupplierContact("");
    setNewSupplierPhone("");
    setNewSupplierEmail("");
    setNewSupplierAddress("");
    setNewSupplierTerms("0");
    setSupplierError("");
    setShowAddSupplierModal(true);
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) {
      setSupplierError("Supplier name is required");
      return;
    }
    setSupplierSubmitting(true);
    setSupplierError("");
    try {
      const res = await createSupplier({
        supplierCode: newSupplierCode.trim() || `SUP-${Date.now().toString().slice(-4)}`,
        name: newSupplierName.trim(),
        contactPerson: newSupplierContact.trim() || undefined,
        phone: newSupplierPhone.trim() || undefined,
        email: newSupplierEmail.trim() || undefined,
        address: newSupplierAddress.trim() || undefined,
        paymentTermsDays: Number(newSupplierTerms) || 0,
        isActive: true,
      });

      const newSup = res.data;
      setSuppliers((prev) => [...prev, newSup]);
      setSupplierId(String(newSup.id));
      setShowAddSupplierModal(false);
      setSuccess(`Supplier "${newSup.name}" created and selected!`);
    } catch (err) {
      setSupplierError(
        err instanceof Error ? err.message : "Failed to create supplier",
      );
    } finally {
      setSupplierSubmitting(false);
    }
  };

  // Status Action Handlers
  const handleSubmitPo = async (id: number) => {
    setError("");
    setSuccess("");
    try {
      await submitPurchaseOrder(id);
      setSuccess("Purchase Order submitted for approval");
      load(meta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit PO");
    }
  };

  const handleApprovePo = async (id: number) => {
    setError("");
    setSuccess("");
    try {
      await approvePurchaseOrder(id);
      setSuccess("Purchase Order approved successfully! Ready for receiving.");
      load(meta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve PO");
    }
  };

  const openRejectModal = (po: PurchaseOrder) => {
    setRejectingPo(po);
    setRejectionReason("");
    setError("");
  };

  const handleConfirmReject = async () => {
    if (!rejectingPo) return;
    setRejectSubmitting(true);
    try {
      await rejectPurchaseOrder(rejectingPo.id, rejectionReason || undefined);
      setSuccess(`Purchase Order #${rejectingPo.poNumber} has been rejected`);
      setRejectingPo(null);
      load(meta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject PO");
    } finally {
      setRejectSubmitting(false);
    }
  };

  const handleDeletePo = async (id: number, poNumber: string) => {
    if (!confirm(`Are you sure you want to permanently delete PO ${poNumber}?`)) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      await deletePurchaseOrder(id);
      setSuccess(`Purchase Order ${poNumber} deleted successfully`);
      load(meta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete PO");
    }
  };

  const handleCancelPo = async (id: number, poNumber: string) => {
    if (!confirm(`Are you sure you want to cancel / void PO ${poNumber}?`)) {
      return;
    }
    setError("");
    setSuccess("");
    try {
      await cancelPurchaseOrder(id);
      setSuccess(`Purchase Order ${poNumber} cancelled`);
      load(meta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel PO");
    }
  };

  // Direct Goods Receipt Modal Handlers
  const openReceiveModal = (po: PurchaseOrder) => {
    setReceivePo(po);
    setReceiveDate(new Date().toISOString().slice(0, 10));
    setReceiveNotes(`Direct receipt for PO ${po.poNumber}`);
    setReceiveError("");
    setReceiveRows(
      po.items
        .filter((i) => i.orderedQty - i.receivedQty > 0)
        .map((i) => ({
          poItem: i,
          receivedQty: String(i.orderedQty - i.receivedQty),
          imeis: [],
          imeiInput: "",
        })),
    );
  };

  const updateReceiveRow = (poItemId: number, patch: Partial<ReceiveRow>) => {
    setReceiveRows((prev) =>
      prev.map((r) => (r.poItem.id === poItemId ? { ...r, ...patch } : r)),
    );
  };

  const addReceiveImei = (poItemId: number, valueToAdd?: string) => {
    const row = receiveRows.find((r) => r.poItem.id === poItemId);
    if (!row) return;
    const value = (valueToAdd ?? row.imeiInput).trim();
    if (!value || row.imeis.includes(value)) {
      updateReceiveRow(poItemId, { imeiInput: "" });
      return;
    }
    updateReceiveRow(poItemId, {
      imeis: [...row.imeis, value],
      imeiInput: "",
    });
  };

  const removeReceiveImei = (poItemId: number, imei: string) => {
    const row = receiveRows.find((r) => r.poItem.id === poItemId);
    if (!row) return;
    updateReceiveRow(poItemId, {
      imeis: row.imeis.filter((v) => v !== imei),
    });
  };

  const handleCreateReceipt = async () => {
    if (!receivePo) return;
    setReceiveError("");

    const items = receiveRows
      .filter((r) => Number(r.receivedQty) > 0)
      .map((r) => ({
        poItemId: r.poItem.id,
        productId: r.poItem.productId,
        receivedQty: Number(r.receivedQty),
        unitCost: parseFloat(r.poItem.unitCost),
        imeis: r.imeis.length > 0 ? r.imeis : undefined,
      }));

    if (items.length === 0) {
      setReceiveError("Enter received quantity for at least one item");
      return;
    }

    for (const r of receiveRows.filter((r) => Number(r.receivedQty) > 0)) {
      if (r.poItem.product?.productType === "SERIALIZED") {
        const qty = Number(r.receivedQty);
        if (r.imeis.length !== qty) {
          setReceiveError(
            `${r.poItem.product.sku} is serialized and requires exactly ${qty} IMEI(s) (currently ${r.imeis.length} entered)`,
          );
          return;
        }
      }
    }

    setReceiveSubmitting(true);
    try {
      const res = await createGoodsReceipt({
        purchaseOrderId: receivePo.id,
        receiveDate: new Date(receiveDate).toISOString(),
        notes: receiveNotes || undefined,
        items,
      });

      const newGr = res.data;
      setSuccess(
        `Goods Receipt #${newGr.grnNumber} created successfully for PO #${receivePo.poNumber}!`,
      );
      setReceivePo(null);
      load(meta.page);

      // Offer instant label printing
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
      setReceiveError(
        err instanceof Error ? err.message : "Failed to create goods receipt",
      );
    } finally {
      setReceiveSubmitting(false);
    }
  };

  const poTotal = (po: PurchaseOrder) =>
    po.items.reduce(
      (sum, i) => sum + parseFloat(i.unitCost) * i.orderedQty,
      0,
    );

  const formEstimatedTotal = rows.reduce(
    (sum, r) => sum + (Number(r.orderedQty) || 0) * (Number(r.unitCost) || 0),
    0,
  );

  const activeScanRow = receiveRows.find((r) => r.poItem.id === scanningRowId);
  const activeBulkRow = receiveRows.find((r) => r.poItem.id === bulkModalRowId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Purchase Orders
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage procurement, supplier orders, approval workflows, and receiving.
          </p>
        </div>
        <button
          onClick={openCreateForm}
          className="inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 transition-colors"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Purchase Order
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

      {/* Filters */}
      <div className="flex items-center gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider pl-2">
          Status:
        </span>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          {PO_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      {/* Create / Edit Form Card */}
      {showForm && (
        <div className="rounded-xl bg-white p-5 sm:p-6 shadow-md border border-blue-100 ring-1 ring-blue-50">
          <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
            <h2 className="text-lg font-bold text-gray-900">
              {editingPoId ? `Edit Purchase Order #${editingPoId}` : "New Purchase Order"}
            </h2>
            <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full">
              {editingPoId ? "Draft / Rejected Mode" : "Initial Draft"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-gray-700 uppercase">
                  Supplier <span className="text-red-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={openSupplierModal}
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                >
                  + Add Supplier
                </button>
              </div>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              >
                <option value="">Select supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.supplierCode})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Order Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={orderDate}
                onChange={(e) => setOrderDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Notes / Terms
              </label>
              <input
                type="text"
                placeholder="e.g. FOB Destination, Net 30"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xs font-semibold text-gray-700 uppercase mb-2">
              Line Items
            </div>
            <div className="space-y-2">
              {rows.map((row, i) => {
                const lineTotal =
                  (Number(row.orderedQty) || 0) * (Number(row.unitCost) || 0);
                return (
                  <div
                    key={i}
                    className="flex flex-wrap md:flex-nowrap items-center gap-2 bg-gray-50 p-2.5 rounded-lg border border-gray-200"
                  >
                    <select
                      value={row.productId}
                      onChange={(e) => {
                        const prod = products.find(
                          (p) => String(p.id) === e.target.value,
                        );
                        updateRow(i, {
                          productId: e.target.value,
                          unitCost: prod
                            ? String(parseFloat(prod.costPrice))
                            : row.unitCost,
                        });
                      }}
                      className="flex-1 min-w-[200px] rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Select product...</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.sku} — {p.name}{" "}
                          {p.productType === "SERIALIZED" ? "(Serialized)" : ""}
                        </option>
                      ))}
                    </select>

                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 font-medium md:hidden">
                        Qty:
                      </span>
                      <input
                        type="number"
                        min={1}
                        value={row.orderedQty}
                        onChange={(e) =>
                          updateRow(i, { orderedQty: e.target.value })
                        }
                        className="w-24 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-right focus:border-blue-500 focus:outline-none"
                        placeholder="Qty"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500 font-medium md:hidden">
                        Cost:
                      </span>
                      <input
                        type="number"
                        min={0}
                        step="1000"
                        value={row.unitCost}
                        onChange={(e) =>
                          updateRow(i, { unitCost: e.target.value })
                        }
                        className="w-36 rounded-lg border border-gray-300 px-3 py-2 text-sm bg-white text-right focus:border-blue-500 focus:outline-none"
                        placeholder="Unit cost"
                      />
                    </div>

                    <div className="w-32 text-right text-xs font-semibold text-gray-700 px-2">
                      IDR {lineTotal.toLocaleString()}
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setRows((prev) =>
                          prev.length > 1
                            ? prev.filter((_, j) => j !== i)
                            : [{ ...emptyRow }],
                        )
                      }
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg text-sm transition-colors"
                      title="Remove Row"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-gray-100">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, { ...emptyRow }])}
                className="rounded-lg bg-gray-100 px-3.5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                + Add Item Row
              </button>
              <span className="text-sm font-semibold text-gray-700">
                Estimated Total: IDR {formEstimatedTotal.toLocaleString()}
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingPoId(null);
                }}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSavePo}
                disabled={submitting}
                className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {submitting
                  ? "Saving..."
                  : editingPoId
                    ? "Update PO"
                    : "Create PO (Draft)"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO List Table */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/75 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3.5">PO Number</th>
                <th className="px-4 py-3.5">Supplier</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Order Date</th>
                <th className="px-4 py-3.5 text-center">Items</th>
                <th className="px-4 py-3.5 text-right">Total Cost</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading purchase orders...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && orders.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    No purchase orders found matching criteria.
                  </td>
                </tr>
              )}
              {orders.map((po) => (
                <PoTableRow
                  key={po.id}
                  po={po}
                  expanded={expanded === po.id}
                  onToggle={() =>
                    setExpanded(expanded === po.id ? null : po.id)
                  }
                  onEdit={() => openEditForm(po)}
                  onDelete={() => handleDeletePo(po.id, po.poNumber)}
                  onSubmit={() => handleSubmitPo(po.id)}
                  onApprove={() => handleApprovePo(po.id)}
                  onReject={() => openRejectModal(po)}
                  onCancel={() => handleCancelPo(po.id, po.poNumber)}
                  onReceive={() => openReceiveModal(po)}
                  total={poTotal(po)}
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
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => load(meta.page + 1)}
              disabled={meta.page >= meta.pageCount}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Quick Add Supplier Modal */}
      {showAddSupplierModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <h3 className="text-lg font-bold text-gray-900">
                Add New Supplier
              </h3>
              <button
                type="button"
                onClick={() => setShowAddSupplierModal(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                &times;
              </button>
            </div>

            {supplierError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200">
                {supplierError}
              </div>
            )}

            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Supplier Code <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={newSupplierCode}
                    onChange={(e) => setNewSupplierCode(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Supplier Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. PT Mitra Jaya"
                    value={newSupplierName}
                    onChange={(e) => setNewSupplierName(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Contact Person
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Budi Santoso"
                    value={newSupplierContact}
                    onChange={(e) => setNewSupplierContact(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Phone
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 08123456789"
                    value={newSupplierPhone}
                    onChange={(e) => setNewSupplierPhone(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    placeholder="supplier@example.com"
                    value={newSupplierEmail}
                    onChange={(e) => setNewSupplierEmail(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                    Payment Terms (Days)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={newSupplierTerms}
                    onChange={(e) => setNewSupplierTerms(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Address
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Jl. Thamrin No. 10, Jakarta"
                  value={newSupplierAddress}
                  onChange={(e) => setNewSupplierAddress(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddSupplierModal(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={supplierSubmitting}
                  className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {supplierSubmitting ? "Creating..." : "Save Supplier"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Rejection Reason Modal */}
      {rejectingPo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-gray-100">
            <h3 className="text-lg font-bold text-gray-900 mb-1">
              Reject Purchase Order
            </h3>
            <p className="text-xs text-gray-500 mb-4">
              PO #{rejectingPo.poNumber} — {rejectingPo.supplier?.name}
            </p>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Reason for Rejection (Optional)
              </label>
              <textarea
                rows={3}
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="e.g. Budget ceiling exceeded, requested pricing discount not applied..."
                className="w-full rounded-lg border border-gray-300 p-2.5 text-sm focus:border-rose-500 focus:ring-1 focus:ring-rose-500 focus:outline-none"
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setRejectingPo(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={rejectSubmitting}
                className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {rejectSubmitting ? "Rejecting..." : "Confirm Rejection"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Direct Goods Receipt Modal */}
      {receivePo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <span>Receive Items</span>
                  <span className="text-sm font-mono font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {receivePo.poNumber}
                  </span>
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Supplier: {receivePo.supplier?.name} | Order Date:{" "}
                  {receivePo.orderDate?.slice(0, 10)}
                </p>
              </div>
              <button
                onClick={() => setReceivePo(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
              >
                &times;
              </button>
            </div>

            {receiveError && (
              <div className="mb-4 rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-200">
                {receiveError}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
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
                <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                  Receipt Notes / Delivery Note
                </label>
                <input
                  type="text"
                  placeholder="e.g. Delivery Slip #9921, Arrived in good condition"
                  value={receiveNotes}
                  onChange={(e) => setReceiveNotes(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div className="text-xs font-semibold text-gray-700 uppercase">
                Receiving Line Items
              </div>
              {receiveRows.map((r) => {
                const outstanding =
                  r.poItem.orderedQty - r.poItem.receivedQty;
                const isSerialized =
                  r.poItem.product?.productType === "SERIALIZED";
                const qtyNum = Number(r.receivedQty) || 0;

                return (
                  <div
                    key={r.poItem.id}
                    className="p-4 rounded-xl bg-gray-50 border border-gray-200 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm text-gray-900">
                          {r.poItem.product
                            ? `${r.poItem.product.sku} — ${r.poItem.product.name}`
                            : `Product #${r.poItem.productId}`}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          Ordered:{" "}
                          <span className="font-medium text-gray-700">
                            {r.poItem.orderedQty}
                          </span>{" "}
                          | Already Received:{" "}
                          <span className="font-medium text-gray-700">
                            {r.poItem.receivedQty}
                          </span>{" "}
                          | Outstanding:{" "}
                          <span className="font-semibold text-blue-600">
                            {outstanding}
                          </span>
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
                          value={r.receivedQty}
                          onChange={(e) => {
                            const val = Math.min(
                              outstanding,
                              Math.max(0, Number(e.target.value)),
                            );
                            updateReceiveRow(r.poItem.id, {
                              receivedQty: String(val),
                            });
                          }}
                          className="w-20 rounded-lg border border-gray-300 px-3 py-1.5 text-sm bg-white text-right font-medium focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Serialized IMEI input & Camera/Bulk tools */}
                    {isSerialized && qtyNum > 0 && (
                      <div className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-gray-700">
                              IMEI Numbers:
                            </span>
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                r.imeis.length === qtyNum
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {r.imeis.length} of {qtyNum} registered
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setScanningRowId(r.poItem.id)}
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
                              onClick={() => setBulkModalRowId(r.poItem.id)}
                              className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              <span>Bulk Paste</span>
                            </button>
                          </div>
                        </div>

                        {r.imeis.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-gray-50 rounded-lg border border-gray-100">
                            {r.imeis.map((imei) => (
                              <span
                                key={imei}
                                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-0.5 text-xs font-mono font-medium text-blue-700 border border-blue-200"
                              >
                                {imei}
                                <button
                                  type="button"
                                  onClick={() =>
                                    removeReceiveImei(r.poItem.id, imei)
                                  }
                                  className="text-blue-500 hover:text-blue-700 font-bold"
                                >
                                  &times;
                                </button>
                              </span>
                            ))}
                          </div>
                        )}

                        {r.imeis.length < qtyNum && (
                          <div className="flex gap-2">
                            <input
                              type="text"
                              placeholder="Scan or enter 15-digit IMEI..."
                              value={r.imeiInput}
                              onChange={(e) =>
                                updateReceiveRow(r.poItem.id, {
                                  imeiInput: e.target.value,
                                })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  addReceiveImei(r.poItem.id);
                                }
                              }}
                              className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-mono focus:border-blue-500 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => addReceiveImei(r.poItem.id)}
                              className="rounded-lg bg-gray-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-gray-900"
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

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 mt-4">
              <button
                type="button"
                onClick={() => setReceivePo(null)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateReceipt}
                disabled={receiveSubmitting}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2"
              >
                {receiveSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing Receipt...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Confirm & Receive Items</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Camera Barcode Scanner Modal */}
      {scanningRowId !== null && activeScanRow && (
        <CameraBarcodeScanner
          isOpen={true}
          onClose={() => setScanningRowId(null)}
          onScan={(code) => addReceiveImei(activeScanRow.poItem.id, code)}
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
            updateReceiveRow(activeBulkRow.poItem.id, {
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

function PoTableRow({
  po,
  expanded,
  onToggle,
  onEdit,
  onDelete,
  onSubmit,
  onApprove,
  onReject,
  onCancel,
  onReceive,
  total,
}: {
  po: PurchaseOrder;
  expanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSubmit: () => void;
  onApprove: () => void;
  onReject: () => void;
  onCancel: () => void;
  onReceive: () => void;
  total: number;
}) {
  const isDraft = po.status === "DRAFT";
  const isSubmitted = po.status === "SUBMITTED";
  const isApproved = po.status === "APPROVED";
  const isRejected = po.status === "REJECTED";
  const isPartial = po.status === "PARTIALLY_RECEIVED";
  const canCancel = !["COMPLETED", "CANCELLED"].includes(po.status);

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
            <span>{po.poNumber}</span>
          </button>
        </td>
        <td className="px-4 py-3.5 font-medium text-gray-900">
          {po.supplier?.name ?? "-"}
        </td>
        <td className="px-4 py-3.5">
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
              statusColor[po.status] ?? "bg-gray-100 text-gray-700 border-gray-200"
            }`}
          >
            {po.status.replace(/_/g, " ")}
          </span>
        </td>
        <td className="px-4 py-3.5 text-gray-600 text-xs">
          {po.orderDate?.slice(0, 10)}
        </td>
        <td className="px-4 py-3.5 text-center text-gray-700 font-medium">
          {po.items.length}
        </td>
        <td className="px-4 py-3.5 text-right font-semibold text-gray-900">
          IDR {total.toLocaleString()}
        </td>
        <td className="px-4 py-3.5 text-right">
          <div className="inline-flex items-center justify-end gap-2">
            {/* Draft Actions */}
            {isDraft && (
              <>
                <button
                  onClick={onSubmit}
                  className="rounded bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
                >
                  Submit
                </button>
                <button
                  onClick={onEdit}
                  className="rounded bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={onDelete}
                  className="rounded bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </>
            )}

            {/* Submitted Actions (Approval Flow) */}
            {isSubmitted && (
              <>
                <button
                  onClick={onApprove}
                  className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition-colors"
                >
                  Approve
                </button>
                <button
                  onClick={onReject}
                  className="rounded bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition-colors"
                >
                  Reject
                </button>
              </>
            )}

            {/* Rejected Actions */}
            {isRejected && (
              <>
                <button
                  onClick={onEdit}
                  className="rounded bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  Edit & Re-submit
                </button>
                <button
                  onClick={onDelete}
                  className="rounded bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                >
                  Delete
                </button>
              </>
            )}

            {/* Approved & Partially Received: Receive Action */}
            {(isApproved || isPartial) && (
              <button
                onClick={onReceive}
                className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors flex items-center gap-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
                <span>Receive Items</span>
              </button>
            )}

            {/* Cancel Action */}
            {canCancel && !isDraft && (
              <button
                onClick={onCancel}
                className="text-xs text-gray-500 hover:text-red-600 hover:underline px-1 py-1"
              >
                Cancel
              </button>
            )}
          </div>
        </td>
      </tr>

      {/* Expanded PO Details */}
      {expanded && (
        <tr className="bg-gray-50/90 border-y border-gray-200">
          <td colSpan={7} className="px-6 py-4">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between text-xs text-gray-600 gap-4">
                <div>
                  <span className="font-semibold text-gray-700">Expected Delivery:</span>{" "}
                  {po.expectedDate?.slice(0, 10) || "Not specified"}
                </div>
                <div>
                  <span className="font-semibold text-gray-700">Created By:</span>{" "}
                  {po.creator?.fullName || `#${po.createdBy}`}
                </div>
                {po.notes && (
                  <div className="w-full bg-white p-2.5 rounded-lg border border-gray-200 text-gray-700 whitespace-pre-line">
                    <span className="font-semibold text-gray-900 block mb-0.5">Notes:</span>
                    {po.notes}
                  </div>
                )}
              </div>

              <div className="rounded-lg bg-white border border-gray-200 overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-100 text-left text-gray-600 font-semibold uppercase">
                      <th className="py-2 px-3">Product</th>
                      <th className="py-2 px-3 text-center">Ordered</th>
                      <th className="py-2 px-3 text-center">Received</th>
                      <th className="py-2 px-3 text-center">Outstanding</th>
                      <th className="py-2 px-3 text-right">Unit Cost</th>
                      <th className="py-2 px-3 text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {po.items.map((item) => {
                      const outstanding = item.orderedQty - item.receivedQty;
                      const lineTotal =
                        parseFloat(item.unitCost) * item.orderedQty;
                      return (
                        <tr key={item.id} className="hover:bg-gray-50/50">
                          <td className="py-2 px-3 font-medium text-gray-900">
                            {item.product
                              ? `${item.product.sku} — ${item.product.name}`
                              : `Product #${item.productId}`}
                          </td>
                          <td className="py-2 px-3 text-center font-medium">
                            {item.orderedQty}
                          </td>
                          <td className="py-2 px-3 text-center text-emerald-700 font-semibold">
                            {item.receivedQty}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span
                              className={`px-1.5 py-0.5 rounded font-semibold ${
                                outstanding === 0
                                  ? "bg-green-100 text-green-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {outstanding}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-right text-gray-600">
                            IDR {parseFloat(item.unitCost).toLocaleString()}
                          </td>
                          <td className="py-2 px-3 text-right font-semibold text-gray-900">
                            IDR {lineTotal.toLocaleString()}
                          </td>
                        </tr>
                      );
                    })}
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
