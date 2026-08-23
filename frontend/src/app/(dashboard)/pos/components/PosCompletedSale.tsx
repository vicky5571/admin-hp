"use client";

import { downloadReceiptPdf } from "@/lib/api";

interface PosCompletedSaleProps {
  saleResult: any;
  onPrintReceipt: () => void;
  onNewSale: () => void;
}

export default function PosCompletedSale({
  saleResult,
  onPrintReceipt,
  onNewSale,
}: PosCompletedSaleProps) {
  if (!saleResult) return null;

  const grandTotalNum = parseFloat(saleResult.grandTotal) || 0;
  const paidTotalNum = parseFloat(saleResult.paidTotal) || grandTotalNum;
  const changeNum = parseFloat(saleResult.change) || 0;

  return (
    <div className="max-w-lg mx-auto mt-6 text-center">
      <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-xl border border-gray-200 space-y-5">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-600 text-3xl mx-auto shadow-xs">
          ✓
        </div>

        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">
            Transaction Complete!
          </h2>
          <p className="text-xs text-gray-500 font-mono mt-1">
            Invoice:{" "}
            <span className="font-bold text-gray-800">
              {saleResult.invoiceNumber}
            </span>
            {saleResult.isOffline && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                OFFLINE SAVED
              </span>
            )}
          </p>
        </div>

        {/* Financial Summary */}
        <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 text-xs space-y-2 text-left font-mono">
          <div className="flex justify-between text-gray-600">
            <span className="font-sans">Grand Total:</span>
            <span className="font-bold text-gray-900">
              IDR {grandTotalNum.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex justify-between text-gray-600">
            <span className="font-sans">Amount Tendered:</span>
            <span className="font-bold text-blue-700">
              IDR {paidTotalNum.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex justify-between border-t border-gray-200 pt-2 text-sm">
            <span className="font-sans font-bold text-emerald-800">
              Change Due (Kembalian):
            </span>
            <span className="font-black text-emerald-600">
              IDR {changeNum.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <button
            type="button"
            onClick={onPrintReceipt}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-3 text-xs font-bold text-white hover:bg-emerald-700 shadow-md transition-colors"
          >
            <span>🖨️</span>
            <span>Print Receipt</span>
          </button>

          {!saleResult.isOffline && (
            <button
              type="button"
              onClick={() => downloadReceiptPdf(saleResult.id)}
              className="flex items-center justify-center gap-1.5 rounded-xl bg-gray-100 px-4 py-3 text-xs font-bold text-gray-800 hover:bg-gray-200 border border-gray-300 transition-colors"
            >
              <span>📄</span>
              <span>Download PDF</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNewSale}
            className="flex items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white hover:bg-blue-700 shadow-md transition-colors"
          >
            <span>+</span>
            <span>New Sale (F2)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
