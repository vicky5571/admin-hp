"use client";

import { useState } from "react";

interface StocktakeItem {
  id: number;
  sku: string;
  name: string;
  category?: string | null;
  brand?: string | null;
  product_type: string;
  on_hand_qty: number;
  min_stock_alert: number;
  cost_price: string;
}

interface PrintStocktakeSheetModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: StocktakeItem[];
  filterTitle?: string;
}

export default function PrintStocktakeSheetModal({
  isOpen,
  onClose,
  items,
  filterTitle,
}: PrintStocktakeSheetModalProps) {
  const [isBlindCount, setIsBlindCount] = useState<boolean>(false);
  const [auditorName, setAuditorName] = useState<string>("");
  const [warehouseSection, setWarehouseSection] = useState<string>("MAIN_STORE");

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const currentDate = new Date().toLocaleString("id-ID", {
    dateStyle: "full",
    timeStyle: "short",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-5xl max-h-[92vh] rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        {/* Screen Controls Header (Hidden during Print) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-6 py-4 border-b border-gray-200 bg-slate-50 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-600 text-white text-sm font-bold shadow-xs">
              📋
            </span>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Physical Stocktake Sheet (Lembar Stock Opname)
              </h3>
              <p className="text-xs text-gray-500">
                {items.length} items ready for warehouse physical audit
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs">
            {/* Blind Count Toggle */}
            <label className="inline-flex items-center gap-1.5 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-gray-300 font-semibold text-gray-700 shadow-2xs hover:bg-gray-50">
              <input
                type="checkbox"
                checked={isBlindCount}
                onChange={(e) => setIsBlindCount(e.target.checked)}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
              />
              <span>Blind Count (Hide System Qty)</span>
            </label>

            {/* Auditor Name */}
            <input
              type="text"
              value={auditorName}
              onChange={(e) => setAuditorName(e.target.value)}
              placeholder="Auditor Staff Name..."
              className="rounded-xl border border-gray-300 bg-white px-3 py-1.5 text-xs font-semibold focus:border-blue-500 focus:outline-none shadow-2xs"
            />

            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-md transition-colors"
            >
              <span>🖨️</span>
              <span>Print A4 Sheet</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 font-bold text-lg px-2"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Printable Paper Document Preview */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-10 bg-white print:p-0 print:overflow-visible">
          <div className="max-w-4xl mx-auto space-y-6 text-gray-900 font-sans print:max-w-none">
            {/* Sheet Title & Metadata */}
            <div className="border-b-2 border-slate-900 pb-4 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight uppercase text-slate-900">
                  Physical Inventory Count Sheet
                </h1>
                <p className="text-xs font-bold text-slate-600">
                  SMARTSTORE RETAIL &bull; WAREHOUSE STOCK AUDIT (STOCK OPNAME)
                </p>
                {filterTitle && (
                  <p className="text-[11px] font-semibold text-blue-700 mt-0.5">
                    Scope: {filterTitle}
                  </p>
                )}
              </div>

              <div className="text-right text-xs space-y-0.5 font-mono">
                <div>
                  <span className="text-gray-500 font-sans font-medium">Audit Date: </span>
                  <span className="font-bold">{currentDate}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-sans font-medium">Auditor: </span>
                  <span className="font-bold">{auditorName || "Staff Auditor"}</span>
                </div>
                <div>
                  <span className="text-gray-500 font-sans font-medium">Total SKUs: </span>
                  <span className="font-bold">{items.length} items</span>
                </div>
              </div>
            </div>

            {/* Instruction Banner */}
            <div className="rounded-xl border border-gray-200 bg-slate-50 p-3 text-[11px] text-gray-700 flex justify-between items-center print:border-gray-400">
              <span>
                <strong>Instructions:</strong> Count physical units on shelves/vault. Write the actual count in the <strong>Physical Count</strong> box. Mark serialized phone IMEI checkboxes.
              </span>
              {isBlindCount && (
                <span className="font-bold text-purple-800 bg-purple-100 px-2 py-0.5 rounded border border-purple-200 shrink-0">
                  BLIND AUDIT MODE
                </span>
              )}
            </div>

            {/* Stocktake Table */}
            <div className="border border-slate-900 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-900 text-[10px] font-black uppercase tracking-wider text-slate-800">
                    <th className="py-2.5 px-3 border-r border-slate-300 w-8 text-center">
                      No.
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-300 w-28 font-mono">
                      SKU / Barcode
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-300">
                      Product Name & Brand
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-300 w-20 text-center">
                      Type
                    </th>
                    {!isBlindCount && (
                      <th className="py-2.5 px-3 border-r border-slate-300 w-20 text-right font-mono">
                        System Qty
                      </th>
                    )}
                    <th className="py-2.5 px-3 border-r border-slate-300 w-28 text-center bg-blue-50/50 print:bg-transparent">
                      Physical Count
                    </th>
                    <th className="py-2.5 px-3 border-r border-slate-300 w-24 text-center">
                      Variance (+/-)
                    </th>
                    <th className="py-2.5 px-3 w-28 text-center">
                      Verification
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-300">
                  {items.map((item, index) => {
                    const isSerialized = item.product_type === "SERIALIZED";

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 print:hover:bg-transparent">
                        <td className="py-2.5 px-3 border-r border-slate-300 text-center font-mono text-[11px] text-gray-500">
                          {index + 1}
                        </td>

                        <td className="py-2.5 px-3 border-r border-slate-300 font-mono font-bold text-[11px] text-gray-900">
                          {item.sku}
                        </td>

                        <td className="py-2.5 px-3 border-r border-slate-300">
                          <div className="font-bold text-gray-900 leading-tight">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            {item.category ?? "-"} {item.brand ? `• ${item.brand}` : ""}
                          </div>
                        </td>

                        <td className="py-2.5 px-3 border-r border-slate-300 text-center text-[10px] font-bold">
                          {isSerialized ? "📱 IMEI" : "Standard"}
                        </td>

                        {!isBlindCount && (
                          <td className="py-2.5 px-3 border-r border-slate-300 text-right font-mono font-black text-xs text-gray-900">
                            {item.on_hand_qty}
                          </td>
                        )}

                        {/* Blank Physical Count Box for Manual Pen Entry */}
                        <td className="py-2 px-3 border-r border-slate-300 text-center bg-blue-50/20 print:bg-transparent">
                          <div className="h-6 w-full rounded border-2 border-dashed border-slate-400 bg-white"></div>
                        </td>

                        {/* Blank Variance Box */}
                        <td className="py-2 px-3 border-r border-slate-300 text-center">
                          <div className="h-6 w-full rounded border-2 border-dashed border-slate-300 bg-white"></div>
                        </td>

                        {/* Checkboxes */}
                        <td className="py-2 px-3 text-center text-[10px] text-gray-600">
                          <div className="flex items-center justify-center gap-2 font-mono">
                            <span>[ ] OK</span>
                            <span>[ ] Diff</span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Signatures & Auditor Sign-off Box */}
            <div className="pt-8 border-t border-gray-200 grid grid-cols-3 gap-8 text-xs text-center">
              <div className="space-y-12">
                <p className="font-bold text-gray-700 uppercase">
                  Counted By (Auditor Staff)
                </p>
                <div className="border-t border-slate-900 pt-1.5">
                  <p className="font-semibold text-gray-900">
                    {auditorName || "Name & Signature"}
                  </p>
                  <p className="text-[10px] text-gray-400">Date: _______________</p>
                </div>
              </div>

              <div className="space-y-12">
                <p className="font-bold text-gray-700 uppercase">
                  Verified By (Warehouse Lead)
                </p>
                <div className="border-t border-slate-900 pt-1.5">
                  <p className="font-semibold text-gray-900">Name & Signature</p>
                  <p className="text-[10px] text-gray-400">Date: _______________</p>
                </div>
              </div>

              <div className="space-y-12">
                <p className="font-bold text-gray-700 uppercase">
                  Approved By (Store Manager)
                </p>
                <div className="border-t border-slate-900 pt-1.5">
                  <p className="font-semibold text-gray-900">Name & Signature</p>
                  <p className="text-[10px] text-gray-400">Date: _______________</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
