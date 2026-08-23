"use client";

import { useMemo, useState } from "react";
import { SplitPaymentLine } from "../types";

interface PosPaymentPanelProps {
  rawSubtotal: number;
  discountTotal: number;
  taxTotal: number;
  grandTotal: number;
  taxEnabled: boolean;
  globalDiscountPercent: number | null;
  submitting: boolean;
  isOnline: boolean;
  onToggleTax: () => void;
  onApplyGlobalDiscount: (pct: number) => void;
  onClearDiscounts: () => void;
  onOpenCustomGlobalDiscount: () => void;
  onCheckout: (
    isSplit: boolean,
    singleMethod: string,
    singleAmount: number,
    splitLines: SplitPaymentLine[],
  ) => void;
}

const QUICK_DISCOUNTS = [5, 10, 15, 20];

export default function PosPaymentPanel({
  rawSubtotal,
  discountTotal,
  taxTotal,
  grandTotal,
  taxEnabled,
  globalDiscountPercent,
  submitting,
  isOnline,
  onToggleTax,
  onApplyGlobalDiscount,
  onClearDiscounts,
  onOpenCustomGlobalDiscount,
  onCheckout,
}: PosPaymentPanelProps) {
  // Payment states
  const [isSplitPayment, setIsSplitPayment] = useState(false);
  const [payMethod, setPayMethod] = useState("CASH");
  const [payAmount, setPayAmount] = useState("");
  const [splitPayments, setSplitPayments] = useState<SplitPaymentLine[]>([]);

  // Smart Cash Tender Quick Presets
  const cashPresets = useMemo(() => {
    if (grandTotal <= 0) return [];
    const presets = new Set<number>();
    presets.add(grandTotal);

    const denominations = [50000, 100000, 200000, 500000, 1000000];
    for (const d of denominations) {
      if (d > grandTotal) {
        presets.add(d);
      } else {
        const roundedUp = Math.ceil(grandTotal / d) * d;
        if (roundedUp > grandTotal) presets.add(roundedUp);
      }
    }
    return Array.from(presets)
      .sort((a, b) => a - b)
      .slice(0, 5);
  }, [grandTotal]);

  const amountPaidNum = parseFloat(payAmount) || 0;
  const changeDue = Math.max(0, amountPaidNum - grandTotal);
  const isSingleSufficient =
    payMethod !== "CASH" || (amountPaidNum >= grandTotal && grandTotal > 0);

  // Split calculations
  const splitTotalAllocated = useMemo(
    () => splitPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0),
    [splitPayments],
  );
  const splitRemainingToAllocate = Math.max(0, grandTotal - splitTotalAllocated);

  const handleToggleSplit = () => {
    const next = !isSplitPayment;
    setIsSplitPayment(next);
    if (next && splitPayments.length === 0) {
      setSplitPayments([
        { id: "1", method: "CASH", amount: Math.round(grandTotal / 2) },
        {
          id: "2",
          method: "E_WALLET",
          amount: grandTotal - Math.round(grandTotal / 2),
        },
      ]);
    }
  };

  const handleAddSplitLine = () => {
    setSplitPayments((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        method: "BANK_TRANSFER",
        amount: splitRemainingToAllocate,
      },
    ]);
  };

  const handleRemoveSplitLine = (id: string) => {
    setSplitPayments((prev) => prev.filter((p) => p.id !== id));
  };

  const handleUpdateSplitLine = (
    id: string,
    updates: Partial<SplitPaymentLine>,
  ) => {
    setSplitPayments((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...updates } : p)),
    );
  };

  const handleExecuteCheckout = () => {
    onCheckout(
      isSplitPayment,
      payMethod,
      payMethod === "CASH" ? amountPaidNum : grandTotal,
      splitPayments,
    );
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden space-y-0">
      {/* Quick Discount Shortcuts */}
      <div className="px-4 py-2.5 bg-slate-50 border-b border-gray-200 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
          <span>Discount Shortcuts:</span>
          {globalDiscountPercent !== null && (
            <button
              type="button"
              onClick={onClearDiscounts}
              className="text-red-500 hover:underline font-bold text-[10px]"
            >
              Clear All
            </button>
          )}
        </div>

        <div className="grid grid-cols-5 gap-1.5">
          {QUICK_DISCOUNTS.map((pct) => (
            <button
              key={pct}
              type="button"
              onClick={() => onApplyGlobalDiscount(pct)}
              className={`py-1 rounded-lg text-xs font-bold transition-colors ${
                globalDiscountPercent === pct
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-white text-gray-700 hover:bg-rose-50 border border-gray-300"
              }`}
            >
              {pct}%
            </button>
          ))}
          <button
            type="button"
            onClick={onOpenCustomGlobalDiscount}
            className="py-1 rounded-lg text-xs font-bold bg-white text-blue-700 border border-blue-300 hover:bg-blue-50"
          >
            Custom
          </button>
        </div>
      </div>

      {/* Totals & Tax Summary */}
      <div className="p-4 space-y-2 text-xs">
        <div className="flex justify-between text-gray-600">
          <span>Subtotal</span>
          <span className="font-mono">
            IDR {rawSubtotal.toLocaleString("id-ID")}
          </span>
        </div>

        {discountTotal > 0 && (
          <div className="flex justify-between text-rose-600 font-semibold">
            <span>
              Discount{" "}
              {globalDiscountPercent ? `(${globalDiscountPercent}%)` : ""}:
            </span>
            <span className="font-mono">
              -IDR {discountTotal.toLocaleString("id-ID")}
            </span>
          </div>
        )}

        {/* Tax Toggle */}
        <div className="flex items-center justify-between text-gray-600 py-0.5">
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={taxEnabled}
              onChange={onToggleTax}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
            />
            <span className="text-xs font-medium">PPN 11% (VAT)</span>
          </label>
          <span className="font-mono">
            IDR {taxTotal.toLocaleString("id-ID")}
          </span>
        </div>

        <div className="flex justify-between text-base font-black text-slate-900 border-t-2 border-slate-900 pt-2">
          <span>Grand Total</span>
          <span className="font-mono text-blue-700">
            IDR {grandTotal.toLocaleString("id-ID")}
          </span>
        </div>
      </div>

      {/* Payment Tender Controls */}
      <div className="p-4 bg-slate-50 border-t border-gray-200 space-y-3">
        {/* Payment Mode Selector Tabs */}
        <div className="flex items-center justify-between border-b border-gray-200 pb-2">
          <span className="text-[11px] font-bold text-gray-700">
            Payment Tender
          </span>
          <button
            type="button"
            onClick={handleToggleSplit}
            className={`text-[11px] font-bold px-2 py-0.5 rounded-lg transition-colors ${
              isSplitPayment
                ? "bg-blue-600 text-white shadow-2xs"
                : "bg-gray-200 text-gray-700 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            {isSplitPayment ? "✓ Split Tender Active" : "⮀ Split Payment"}
          </button>
        </div>

        {!isSplitPayment ? (
          /* SINGLE TENDER MODE */
          <div className="space-y-3">
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-xs font-bold">
              {[
                { id: "CASH", label: "💵 Cash" },
                { id: "E_WALLET", label: "📱 QRIS" },
                { id: "BANK_TRANSFER", label: "🏦 Transfer" },
                { id: "DEBIT_CARD", label: "💳 Debit" },
                { id: "CREDIT_CARD", label: "💳 Credit" },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setPayMethod(m.id);
                    if (m.id !== "CASH") setPayAmount(String(grandTotal));
                  }}
                  className={`py-1.5 rounded-lg border transition-colors ${
                    payMethod === m.id
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>

            {payMethod === "CASH" && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                    Cash Tendered (IDR):
                  </label>
                  <input
                    type="number"
                    min={0}
                    step="1000"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    placeholder={grandTotal > 0 ? String(grandTotal) : "0"}
                    className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm font-mono text-right font-bold bg-white focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1">
                  {cashPresets.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPayAmount(String(amt))}
                      className="px-2 py-1 rounded-lg bg-white text-[11px] font-mono font-bold text-slate-800 border border-slate-300 hover:bg-blue-50 hover:border-blue-400"
                    >
                      {amt === grandTotal
                        ? "Exact"
                        : `IDR ${amt.toLocaleString("id-ID")}`}
                    </button>
                  ))}
                </div>

                {/* Change Due */}
                {amountPaidNum > 0 && (
                  <div className="p-2.5 rounded-xl bg-white border border-gray-200 flex justify-between items-center text-xs">
                    <span className="font-semibold text-gray-600">
                      Kembalian / Change:
                    </span>
                    <span
                      className={`font-mono font-black text-sm ${
                        isSingleSufficient ? "text-emerald-600" : "text-rose-600"
                      }`}
                    >
                      {isSingleSufficient
                        ? `IDR ${changeDue.toLocaleString("id-ID")}`
                        : `Kurang IDR ${(grandTotal - amountPaidNum).toLocaleString("id-ID")}`}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* SPLIT TENDER MODE */
          <div className="space-y-2.5">
            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {splitPayments.map((p, idx) => (
                <div
                  key={p.id}
                  className="p-2.5 rounded-xl border border-gray-200 bg-white space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-gray-600">
                      Tender #{idx + 1}
                    </span>
                    {splitPayments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSplitLine(p.id)}
                        className="text-rose-600 hover:text-rose-800 text-xs font-bold"
                      >
                        &times; Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-12 gap-1.5">
                    <div className="col-span-5">
                      <select
                        value={p.method}
                        onChange={(e) =>
                          handleUpdateSplitLine(p.id, {
                            method: e.target.value,
                          })
                        }
                        className="w-full rounded-lg border border-gray-300 p-1.5 text-xs font-bold bg-slate-50 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="CASH">💵 Cash</option>
                        <option value="E_WALLET">📱 QRIS</option>
                        <option value="BANK_TRANSFER">🏦 Transfer</option>
                        <option value="DEBIT_CARD">💳 Debit</option>
                        <option value="CREDIT_CARD">💳 Credit</option>
                      </select>
                    </div>

                    <div className="col-span-7">
                      <input
                        type="number"
                        min={0}
                        step={1000}
                        value={p.amount || ""}
                        onChange={(e) =>
                          handleUpdateSplitLine(p.id, {
                            amount: parseFloat(e.target.value) || 0,
                          })
                        }
                        placeholder="Amount"
                        className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-mono font-bold text-right focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {p.method !== "CASH" && (
                    <input
                      type="text"
                      value={p.referenceNo || ""}
                      onChange={(e) =>
                        handleUpdateSplitLine(p.id, {
                          referenceNo: e.target.value,
                        })
                      }
                      placeholder="Approval / Ref No (Optional)"
                      className="w-full rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-mono focus:border-blue-500 focus:outline-none"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Split Summary */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={handleAddSplitLine}
                className="text-xs text-blue-600 hover:text-blue-800 font-bold"
              >
                + Add Payment Method
              </button>

              {splitRemainingToAllocate > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (splitPayments.length > 0) {
                      const last = splitPayments[splitPayments.length - 1];
                      handleUpdateSplitLine(last.id, {
                        amount: last.amount + splitRemainingToAllocate,
                      });
                    }
                  }}
                  className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold hover:bg-emerald-100"
                >
                  Auto-fill (IDR{" "}
                  {splitRemainingToAllocate.toLocaleString("id-ID")})
                </button>
              )}
            </div>

            <div className="p-2.5 rounded-xl bg-white border border-gray-200 flex justify-between items-center text-xs font-mono">
              <span className="text-gray-600 font-sans font-semibold">
                Total Allocated:
              </span>
              <span
                className={`font-bold ${
                  splitTotalAllocated >= grandTotal
                    ? "text-emerald-700"
                    : "text-rose-600"
                }`}
              >
                IDR {splitTotalAllocated.toLocaleString("id-ID")} /{" "}
                {grandTotal.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        )}

        {/* Checkout Button */}
        <button
          type="button"
          onClick={handleExecuteCheckout}
          disabled={
            grandTotal <= 0 ||
            submitting ||
            (!isSplitPayment && !isSingleSufficient) ||
            (isSplitPayment && splitTotalAllocated < grandTotal)
          }
          className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>Processing Sale...</span>
            </>
          ) : (
            <>
              <span>
                {!isOnline ? "⚡ Process Offline Sale" : "Complete Checkout & Print (Enter)"}
              </span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
