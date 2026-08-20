"use client";

import { GoodsReceipt } from "@/lib/api";

interface PrintGrnSlipProps {
  isOpen: boolean;
  onClose: () => void;
  gr: GoodsReceipt | null;
}

export default function PrintGrnSlip({ isOpen, onClose, gr }: PrintGrnSlipProps) {
  if (!isOpen || !gr) return null;

  const handlePrint = () => {
    window.print();
  };

  // Calculate totals and variances
  let totalPoCost = 0;
  let totalActualCost = 0;
  let totalQty = 0;

  for (const item of gr.items || []) {
    const poUnitCost = parseFloat(item.unitCost) || 0;
    const actualUnitCost = item.actualUnitCost
      ? parseFloat(item.actualUnitCost)
      : poUnitCost;
    const qty = item.receivedQty || 0;

    totalQty += qty;
    totalPoCost += poUnitCost * qty;
    totalActualCost += actualUnitCost * qty;
  }

  const costVariance = totalActualCost - totalPoCost;
  const variancePercent =
    totalPoCost > 0 ? ((costVariance / totalPoCost) * 100).toFixed(1) : "0.0";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[92vh] rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        {/* Screen Controls Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gray-50 print:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600 text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                Goods Receipt Note (GRN) Slip
              </h3>
              <p className="text-xs text-gray-500 font-mono">{gr.grnNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print GRN Slip</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Printable Document Sheet */}
        <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-slate-100/60 print:p-0 print:bg-white print:overflow-visible">
          <div
            id="printable-grn-document"
            className="bg-white border border-gray-200 rounded-xl p-8 max-w-3xl mx-auto shadow-sm print:border-none print:shadow-none print:p-4 text-gray-900 font-sans"
          >
            {/* GRN Top Header */}
            <div className="flex justify-between items-start border-b-2 border-slate-900 pb-5 mb-6">
              <div>
                <h1 className="text-xl font-black tracking-tight text-slate-900 uppercase">
                  SmartStore Retail
                </h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  POS & Inventory Management Suite
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Jakarta, Indonesia | support@smartstore.local
                </p>
              </div>

              <div className="text-right">
                <span className="inline-block px-3 py-1 bg-slate-900 text-white font-mono font-bold text-xs uppercase tracking-wider rounded">
                  Goods Receipt Note
                </span>
                <p className="text-base font-mono font-bold text-blue-700 mt-2">
                  {gr.grnNumber}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  Date: {gr.receiveDate ? new Date(gr.receiveDate).toLocaleDateString() : "-"}
                </p>
              </div>
            </div>

            {/* Information Grid: Supplier & Delivery Reference */}
            <div className="grid grid-cols-2 gap-6 bg-slate-50 rounded-lg p-4 border border-slate-200 mb-6 text-xs">
              {/* Supplier Info */}
              <div className="space-y-1">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Supplier Information
                </p>
                <p className="text-sm font-bold text-slate-900">
                  {gr.purchaseOrder?.supplier?.name ?? "Supplier"}
                </p>
                {gr.purchaseOrder?.supplier?.address && (
                  <p className="text-gray-600">{gr.purchaseOrder.supplier.address}</p>
                )}
                {gr.purchaseOrder?.supplier?.phone && (
                  <p className="text-gray-600">Tel: {gr.purchaseOrder.supplier.phone}</p>
                )}
              </div>

              {/* Delivery Order & Shipment Details */}
              <div className="space-y-1.5 border-l border-slate-200 pl-4">
                <p className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Shipment & Delivery Reference
                </p>
                <div className="grid grid-cols-2 gap-1 text-gray-600">
                  <span className="font-medium text-gray-500">PO Number:</span>
                  <span className="font-mono font-bold text-gray-900">
                    {gr.purchaseOrder?.poNumber ?? `#${gr.purchaseOrderId}`}
                  </span>

                  <span className="font-medium text-gray-500">Supplier DO #:</span>
                  <span className="font-semibold text-gray-900">
                    {gr.supplierDoNumber || "—"}
                  </span>

                  <span className="font-medium text-gray-500">Carrier / Courier:</span>
                  <span className="text-gray-900">{gr.carrierName || "—"}</span>

                  <span className="font-medium text-gray-500">Tracking Ref:</span>
                  <span className="font-mono text-gray-900">
                    {gr.trackingNumber || "—"}
                  </span>

                  <span className="font-medium text-gray-500">Received By:</span>
                  <span className="text-gray-900 font-medium">
                    {gr.receiver?.fullName ?? (gr.receivedBy ? `#${gr.receivedBy}` : "Staff")}
                  </span>
                </div>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="border border-slate-200 rounded-lg overflow-hidden mb-6">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-100 border-b border-slate-200 text-left font-bold text-slate-700 uppercase tracking-wider">
                    <th className="py-2.5 px-3 w-8">#</th>
                    <th className="py-2.5 px-3">Item / SKU</th>
                    <th className="py-2.5 px-3 text-center">Condition</th>
                    <th className="py-2.5 px-3 text-center">Qty Recv</th>
                    <th className="py-2.5 px-3 text-right">PO Unit Cost</th>
                    <th className="py-2.5 px-3 text-right">Actual Cost</th>
                    <th className="py-2.5 px-3 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {gr.items?.map((item, idx) => {
                    const poCost = parseFloat(item.unitCost) || 0;
                    const actCost = item.actualUnitCost
                      ? parseFloat(item.actualUnitCost)
                      : poCost;
                    const lineTotal = actCost * item.receivedQty;
                    const hasCostVariance =
                      item.actualUnitCost && actCost !== poCost;
                    const isDamaged =
                      item.conditionStatus && item.conditionStatus !== "GOOD";

                    return (
                      <tr key={item.id} className="align-top">
                        <td className="py-2.5 px-3 text-gray-400 font-mono">
                          {idx + 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">
                            {item.product?.name || "Product"}
                          </div>
                          <div className="font-mono text-[11px] text-gray-500">
                            SKU: {item.product?.sku || `PROD-${item.productId}`}
                          </div>

                          {/* IMEIs Breakdown */}
                          {item.imeis && item.imeis.length > 0 && (
                            <div className="mt-1.5 pt-1.5 border-t border-dashed border-gray-200">
                              <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider block mb-1">
                                Serialized IMEIs ({item.imeis.length}):
                              </span>
                              <div className="flex flex-wrap gap-1 font-mono text-[10px]">
                                {item.imeis.map((im) => (
                                  <span
                                    key={im.id}
                                    className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200"
                                  >
                                    {im.imeiUnit?.imei ?? (im.imeiUnitId ? `#${im.imeiUnitId}` : `#${im.id}`)}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Condition Notes */}
                          {item.conditionNotes && (
                            <div className="mt-1 text-[11px] text-amber-800 italic bg-amber-50 p-1 rounded border border-amber-200">
                              Remark: {item.conditionNotes}
                            </div>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              isDamaged
                                ? "bg-rose-100 text-rose-800 border border-rose-200"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {item.conditionStatus?.replace(/_/g, " ") || "GOOD"}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-center font-bold text-slate-900 text-sm">
                          {item.receivedQty}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono text-gray-600">
                          IDR {poCost.toLocaleString()}
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-semibold">
                          <span
                            className={
                              hasCostVariance ? "text-blue-700 font-bold" : "text-gray-900"
                            }
                          >
                            IDR {actCost.toLocaleString()}
                          </span>
                        </td>

                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          IDR {lineTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Totals & Notes Section */}
            <div className="grid grid-cols-2 gap-6 mb-8">
              {/* Delivery Remarks */}
              <div className="rounded-lg bg-gray-50 p-3 border border-gray-200 text-xs">
                <span className="font-bold text-gray-700 uppercase tracking-wider text-[10px] block mb-1">
                  Intake & Delivery Notes:
                </span>
                <p className="text-gray-700 whitespace-pre-line">
                  {gr.notes || "No additional delivery remarks recorded."}
                </p>
              </div>

              {/* Financial Breakdown Table */}
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
                  <span>Total Items Received:</span>
                  <span className="font-bold text-gray-900 font-mono">
                    {totalQty} unit(s)
                  </span>
                </div>
                <div className="flex justify-between py-1 border-b border-gray-100 text-gray-600">
                  <span>PO Estimated Total:</span>
                  <span className="font-mono text-gray-800">
                    IDR {totalPoCost.toLocaleString()}
                  </span>
                </div>
                {costVariance !== 0 && (
                  <div className="flex justify-between py-1 border-b border-gray-100 text-xs font-semibold">
                    <span className="text-blue-800">
                      Cost Variance ({costVariance > 0 ? "+" : ""}{variancePercent}%):
                    </span>
                    <span
                      className={`font-mono ${
                        costVariance > 0 ? "text-rose-600" : "text-emerald-600"
                      }`}
                    >
                      {costVariance > 0 ? "+" : ""}IDR {costVariance.toLocaleString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-t-2 border-slate-900 text-sm font-bold text-slate-900">
                  <span>Actual Landed Value:</span>
                  <span className="font-mono text-blue-700">
                    IDR {totalActualCost.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>

            {/* Formal 2-Column Signatures Block */}
            <div className="grid grid-cols-2 gap-8 pt-4 border-t border-slate-200 text-xs">
              {/* Courier / Supplier Signature */}
              <div className="border border-slate-300 rounded-lg p-3 space-y-8">
                <div className="text-center font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Delivered By (Courier / Supplier)
                </div>
                <div className="border-b border-slate-400 mx-4"></div>
                <div className="flex justify-between text-[10px] text-gray-500 px-2">
                  <span>Name: ____________________</span>
                  <span>Date: ____________</span>
                </div>
              </div>

              {/* Warehouse / Store Receiver Signature */}
              <div className="border border-slate-300 rounded-lg p-3 space-y-8">
                <div className="text-center font-bold text-slate-700 uppercase tracking-wider text-[10px]">
                  Received & Verified By (Warehouse)
                </div>
                <div className="border-b border-slate-400 mx-4"></div>
                <div className="flex justify-between text-[10px] text-gray-500 px-2">
                  <span>
                    Name: <strong>{gr.receiver?.fullName || "Staff"}</strong>
                  </span>
                  <span>
                    Date: {gr.receiveDate ? new Date(gr.receiveDate).toLocaleDateString() : "____"}
                  </span>
                </div>
              </div>
            </div>

            {/* Document Footer */}
            <div className="mt-8 pt-3 border-t border-gray-100 text-center text-[10px] text-gray-400 font-mono">
              Generated by SmartStore POS • Official Warehouse Receiving Record • {gr.grnNumber}
            </div>
          </div>
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-white print:hidden text-xs">
          <span className="text-gray-500">
            Tip: Press <strong>Print GRN Slip</strong> or use <kbd className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">Ctrl+P</kbd> / <kbd className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">⌘+P</kbd> to save as PDF.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 font-medium text-gray-600 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>

      {/* Global Print Isolation CSS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-grn-document,
          #printable-grn-document * {
            visibility: visible;
          }
          #printable-grn-document {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}
