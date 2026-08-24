"use client";

import { useEffect, useState } from "react";
import { fetchStockAdjustments, StockAdjustmentRecord } from "@/lib/api";

interface StockAdjustmentsHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function StockAdjustmentsHistoryModal({
  isOpen,
  onClose,
}: StockAdjustmentsHistoryModalProps) {
  const [items, setItems] = useState<StockAdjustmentRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError("");
      fetchStockAdjustments({ limit: 50 })
        .then((res) => setItems(res.data ?? []))
        .catch((err) =>
          setError(err instanceof Error ? err.message : "Failed to load logs"),
        )
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-4xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Stock Adjustments & Shrinkage / Damage Log
            </h3>
            <p className="text-xs text-gray-500">
              Historical ledger of physical cycle counts, damaged write-offs, and inventory corrections.
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
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white">
          {loading ? (
            <div className="p-12 text-center text-xs text-gray-400">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading adjustment audit history...
            </div>
          ) : items.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400">
              No stock adjustments or damage write-offs recorded yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="border-b border-gray-200 bg-slate-50 text-[11px] font-bold text-gray-600 uppercase">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Product / SKU</th>
                  <th className="px-4 py-3 text-center">Adjustment Type</th>
                  <th className="px-4 py-3 text-right">Qty Delta</th>
                  <th className="px-4 py-3">Reason / Details</th>
                  <th className="px-4 py-3">Operator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {items.map((r) => {
                  const isPositive = Number(r.qty) > 0;
                  const isDefective = r.reasonCode?.includes("DAMAGE");
                  const isShrinkage = r.reasonCode?.includes("SHRINKAGE");

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3 text-gray-500 font-sans text-[11px]">
                        {new Date(r.movementTime).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>

                      <td className="px-4 py-3 font-sans">
                        <div className="font-bold text-gray-900 leading-tight">
                          {r.product?.name ?? `Product #${r.productId}`}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono">
                          {r.product?.sku ?? ""}
                          {r.imeiUnit ? ` • IMEI: ${r.imeiUnit.imei}` : ""}
                        </div>
                      </td>

                      <td className="px-4 py-3 text-center font-sans">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDefective
                              ? "bg-rose-100 text-rose-800"
                              : isShrinkage
                                ? "bg-amber-100 text-amber-800"
                                : isPositive
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-gray-100 text-gray-800"
                          }`}
                        >
                          {isDefective
                            ? "💥 Damaged"
                            : isShrinkage
                              ? "📉 Shrinkage"
                              : isPositive
                                ? "📥 Inflow (+)"
                                : "📤 Deduction (-)"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-sm">
                        <span
                          className={
                            isPositive ? "text-emerald-700" : "text-rose-600"
                          }
                        >
                          {isPositive ? `+${r.qty}` : `${r.qty}`}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-sans text-gray-700 max-w-xs truncate">
                        <div className="font-semibold text-gray-900 truncate">
                          {r.reasonCode}
                        </div>
                        {r.notes && (
                          <div className="text-[11px] text-gray-500 italic truncate">
                            {r.notes}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 font-sans text-gray-600 text-[11px]">
                        {r.creator?.fullName || r.creator?.username || "System"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
