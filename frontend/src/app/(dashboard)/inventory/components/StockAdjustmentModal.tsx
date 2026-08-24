"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AdjustmentType,
  createStockAdjustment,
  fetchAvailableImeis,
  ImeiUnit,
  Product,
} from "@/lib/api";

interface StockAdjustmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  initialProductId?: number | null;
  initialOnHand?: number;
  onSuccess: (message: string) => void;
}

const ADJUSTMENT_OPTIONS: {
  type: AdjustmentType;
  label: string;
  isPositive: boolean;
  desc: string;
}[] = [
  {
    type: "DAMAGE",
    label: "💥 Damaged / Defective Stock",
    isPositive: false,
    desc: "Broken boxes, damaged screens, factory defects (Deducts stock)",
  },
  {
    type: "SHRINKAGE",
    label: "📉 Shrinkage / Lost / Stolen",
    isPositive: false,
    desc: "Missing inventory or unrecorded loss (Deducts stock)",
  },
  {
    type: "COUNT_VARIANCE_OUT",
    label: "📦 Stocktake Shortage (Minus)",
    isPositive: false,
    desc: "Physical count is less than system balance (Deducts stock)",
  },
  {
    type: "COUNT_VARIANCE_IN",
    label: "📥 Stocktake Overage (Plus)",
    isPositive: true,
    desc: "Physical count is higher than system balance (Adds stock)",
  },
  {
    type: "PROMO_SAMPLE",
    label: "🎁 Display / Promotional Sample",
    isPositive: false,
    desc: "Allocated for showroom testing or marketing (Deducts stock)",
  },
  {
    type: "FOUND_STOCK",
    label: "🔍 Found Stock / Unrecorded Inflow",
    isPositive: true,
    desc: "Discovered unlogged units in warehouse (Adds stock)",
  },
  {
    type: "CORRECTION_OUT",
    label: "⚙️ Manual Correction (Minus)",
    isPositive: false,
    desc: "General downward ledger reconciliation",
  },
  {
    type: "CORRECTION_IN",
    label: "⚙️ Manual Correction (Plus)",
    isPositive: true,
    desc: "General upward ledger reconciliation",
  },
];

export default function StockAdjustmentModal({
  isOpen,
  onClose,
  products,
  initialProductId,
  initialOnHand,
  onSuccess,
}: StockAdjustmentModalProps) {
  const [selectedProductId, setSelectedProductId] = useState<number | "">(
    initialProductId ?? "",
  );
  const [adjustmentType, setAdjustmentType] = useState<AdjustmentType>("DAMAGE");
  const [qty, setQty] = useState<string>("1");
  const [reason, setReason] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>("");

  // Serialized IMEIs state
  const [availableImeis, setAvailableImeis] = useState<ImeiUnit[]>([]);
  const [selectedImeiIds, setSelectedImeiIds] = useState<number[]>([]);
  const [loadingImeis, setLoadingImeis] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedProductId(initialProductId ?? (products[0]?.id || ""));
      setAdjustmentType("DAMAGE");
      setQty("1");
      setReason("");
      setNotes("");
      setError("");
      setSelectedImeiIds([]);
    }
  }, [isOpen, initialProductId, products]);

  const selectedProduct = useMemo(() => {
    return products.find((p) => p.id === Number(selectedProductId)) || null;
  }, [products, selectedProductId]);

  const isSerialized = selectedProduct?.productType === "SERIALIZED";

  // Load available IMEIs if serialized
  useEffect(() => {
    if (isOpen && selectedProduct && isSerialized) {
      setLoadingImeis(true);
      setSelectedImeiIds([]);
      fetchAvailableImeis(selectedProduct.id)
        .then((res) => setAvailableImeis(res.data ?? []))
        .catch(() => setAvailableImeis([]))
        .finally(() => setLoadingImeis(false));
    } else {
      setAvailableImeis([]);
      setSelectedImeiIds([]);
    }
  }, [isOpen, selectedProduct, isSerialized]);

  if (!isOpen) return null;

  const currentOption = ADJUSTMENT_OPTIONS.find((o) => o.type === adjustmentType)!;
  const isPositive = currentOption.isPositive;

  const qtyNum = parseInt(qty, 10) || 0;
  const currentStock =
    initialOnHand !== undefined && selectedProduct?.id === initialProductId
      ? initialOnHand
      : 0;

  const projectedStock = isPositive
    ? currentStock + qtyNum
    : Math.max(0, currentStock - qtyNum);

  const handleToggleImei = (id: number) => {
    if (selectedImeiIds.includes(id)) {
      setSelectedImeiIds(selectedImeiIds.filter((i) => i !== id));
    } else {
      if (selectedImeiIds.length >= qtyNum) {
        setError(`Cannot select more than ${qtyNum} IMEI(s)`);
        return;
      }
      setError("");
      setSelectedImeiIds([...selectedImeiIds, id]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!selectedProductId) {
      setError("Please select a product");
      return;
    }

    if (qtyNum <= 0) {
      setError("Quantity must be greater than 0");
      return;
    }

    if (!reason.trim()) {
      setError("Please provide a reason code / title");
      return;
    }

    if (isSerialized && !isPositive && selectedImeiIds.length !== qtyNum) {
      setError(
        `Please select exactly ${qtyNum} IMEI unit(s) to write off / adjust (currently ${selectedImeiIds.length} selected)`,
      );
      return;
    }

    setSubmitting(true);
    try {
      const res = await createStockAdjustment({
        productId: Number(selectedProductId),
        adjustmentType,
        qty: qtyNum,
        reason: reason.trim(),
        notes: notes.trim() || undefined,
        imeiUnitIds: isSerialized && selectedImeiIds.length > 0 ? selectedImeiIds : undefined,
      });

      onSuccess(res.data?.message || "Stock successfully adjusted!");
      onClose();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : "Failed to adjust stock");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Record Stock Adjustment & Damage
            </h3>
            <p className="text-xs text-gray-500">
              Log inventory write-offs, physical count discrepancies, and damages.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-xl"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Product Selector */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Select Product:
            </label>
            <select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(Number(e.target.value))}
              className="w-full rounded-xl border border-gray-300 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-gray-900 focus:border-blue-500 focus:outline-none"
              required
            >
              <option value="">-- Choose Product --</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.sku} - {p.name}{" "}
                  {p.productType === "SERIALIZED" ? "📱 (IMEI)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Adjustment Type */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Adjustment Type:
            </label>
            <select
              value={adjustmentType}
              onChange={(e) => setAdjustmentType(e.target.value as AdjustmentType)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2.5 text-xs font-bold text-gray-900 focus:border-blue-500 focus:outline-none"
            >
              {ADJUSTMENT_OPTIONS.map((opt) => (
                <option key={opt.type} value={opt.type}>
                  {opt.label}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-gray-500 mt-1 italic">
              {currentOption.desc}
            </p>
          </div>

          {/* Quantity & Stock Impact Preview */}
          <div className="grid grid-cols-2 gap-3 items-end">
            <div>
              <label className="block font-bold text-gray-700 mb-1">
                Adjustment Quantity:
              </label>
              <input
                type="number"
                min="1"
                step="1"
                value={qty}
                onChange={(e) => setQty(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-mono font-bold text-gray-900 focus:border-blue-500 focus:outline-none"
                required
              />
            </div>

            {/* Impact Pill */}
            <div
              className={`p-2.5 rounded-xl border text-center font-mono text-xs ${
                isPositive
                  ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                  : "bg-rose-50 border-rose-200 text-rose-800"
              }`}
            >
              <span className="text-[10px] font-sans font-bold block opacity-80">
                Stock Impact:
              </span>
              <span className="font-extrabold text-sm">
                {isPositive ? `+${qtyNum}` : `-${qtyNum}`} units
              </span>
            </div>
          </div>

          {/* Serialized IMEI Picker if Product is Serialized */}
          {isSerialized && !isPositive && (
            <div className="space-y-2 rounded-xl bg-slate-50 p-3.5 border border-gray-200">
              <div className="flex items-center justify-between">
                <span className="font-bold text-gray-800">
                  Select {qtyNum} Serialized Unit(s) to Adjust:
                </span>
                <span className="text-[11px] font-mono font-bold text-blue-700">
                  {selectedImeiIds.length} / {qtyNum} selected
                </span>
              </div>

              <div className="max-h-32 overflow-y-auto space-y-1 pr-1">
                {loadingImeis ? (
                  <div className="text-center py-3 text-gray-400">
                    Loading in-stock IMEIs...
                  </div>
                ) : availableImeis.length === 0 ? (
                  <div className="text-center py-3 text-gray-400">
                    No active in-stock IMEI units found for this product.
                  </div>
                ) : (
                  availableImeis.map((u) => {
                    const isSelected = selectedImeiIds.includes(u.id);
                    return (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => handleToggleImei(u.id)}
                        className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-mono transition-colors text-left ${
                          isSelected
                            ? "bg-rose-600 text-white font-bold"
                            : "bg-white text-gray-700 hover:bg-rose-50 border border-gray-200"
                        }`}
                      >
                        <span>{u.imei}</span>
                        <span className="text-[10px]">
                          {isSelected ? "✓ Marked for adjustment" : "+ Pick Unit"}
                        </span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Reason Code */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Reason / Short Title:
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Broken LCD during shelf display / Weekly stock count mismatch"
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block font-bold text-gray-700 mb-1">
              Additional Notes (Optional):
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Write any additional audit details, incident description, or warehouse rack number..."
              rows={2}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-medium focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className={`px-5 py-2 text-xs font-bold text-white rounded-xl shadow-md transition-colors ${
                isPositive
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-rose-600 hover:bg-rose-700"
              } disabled:opacity-50`}
            >
              {submitting
                ? "Processing Adjustment..."
                : isPositive
                  ? "Confirm Stock Increase"
                  : "Confirm Stock Reduction / Damage"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
