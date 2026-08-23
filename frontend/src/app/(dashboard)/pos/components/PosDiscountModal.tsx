"use client";

import { useEffect, useState } from "react";
import { CartItem } from "../types";

interface PosDiscountModalProps {
  targetItem: CartItem | null; // null for cart-wide discount
  isOpen: boolean;
  onClose: () => void;
  onApplyItemDiscount: (productId: number, discountAmount: number) => void;
  onApplyGlobalDiscount: (percent: number) => void;
}

export default function PosDiscountModal({
  targetItem,
  isOpen,
  onClose,
  onApplyItemDiscount,
  onApplyGlobalDiscount,
}: PosDiscountModalProps) {
  const [discountType, setDiscountType] = useState<"PERCENT" | "FIXED">(
    "PERCENT",
  );
  const [value, setValue] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setValue("");
      setError("");
      setDiscountType("PERCENT");
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isItemDiscount = targetItem !== null;
  const itemSubtotal = targetItem ? targetItem.qty * targetItem.unitPrice : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(value);
    if (isNaN(val) || val < 0) {
      setError("Please enter a valid positive discount amount.");
      return;
    }

    if (discountType === "PERCENT" && val > 100) {
      setError("Percentage discount cannot exceed 100%.");
      return;
    }

    if (isItemDiscount && targetItem) {
      let finalDiscount = val;
      if (discountType === "PERCENT") {
        finalDiscount = Math.round(itemSubtotal * (val / 100));
      }
      if (finalDiscount > itemSubtotal) {
        setError("Discount amount cannot exceed the line item total.");
        return;
      }
      onApplyItemDiscount(targetItem.productId, finalDiscount);
    } else {
      // Global cart discount
      if (discountType === "PERCENT") {
        onApplyGlobalDiscount(val);
      } else {
        // approximate percent or apply
        onApplyGlobalDiscount(val);
      }
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-gray-200 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              {isItemDiscount
                ? `Item Discount: ${targetItem.name}`
                : "Cart-Wide Discount"}
            </h3>
            <p className="text-[11px] text-gray-500">
              {isItemDiscount
                ? `Line subtotal: IDR ${itemSubtotal.toLocaleString("id-ID")}`
                : "Applies percentage markdown across all cart lines"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          {isItemDiscount && (
            <div className="grid grid-cols-2 gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setDiscountType("PERCENT")}
                className={`py-1.5 rounded-xl border transition-colors ${
                  discountType === "PERCENT"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                % Percentage
              </button>
              <button
                type="button"
                onClick={() => setDiscountType("FIXED")}
                className={`py-1.5 rounded-xl border transition-colors ${
                  discountType === "FIXED"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-200"
                }`}
              >
                IDR Fixed Rupiah
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              {discountType === "PERCENT"
                ? "Discount Percentage (%):"
                : "Discount Amount (IDR):"}
            </label>
            <input
              type="number"
              min="0"
              step={discountType === "PERCENT" ? "1" : "1000"}
              max={discountType === "PERCENT" ? "100" : undefined}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={discountType === "PERCENT" ? "e.g. 10" : "e.g. 50000"}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-sm font-mono font-bold text-rose-600 focus:border-blue-500 focus:outline-none"
              autoFocus
              required
            />
          </div>

          {/* Quick Presets for Percentage */}
          {discountType === "PERCENT" && (
            <div className="flex gap-1.5">
              {[5, 10, 15, 20, 25].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setValue(String(pct))}
                  className="flex-1 py-1 rounded-lg bg-gray-100 hover:bg-rose-50 text-xs font-bold text-gray-700 hover:text-rose-700 border border-gray-200 transition-colors"
                >
                  {pct}%
                </button>
              ))}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md"
            >
              Apply Discount
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
