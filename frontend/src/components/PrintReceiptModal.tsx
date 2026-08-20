"use client";

import React from "react";
import { ReceiptPayload, downloadReceiptPdf } from "@/lib/api";

interface PrintReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptPayload | null;
}

export default function PrintReceiptModal({
  isOpen,
  onClose,
  receipt,
}: PrintReceiptModalProps) {
  if (!isOpen || !receipt) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async () => {
    try {
      await downloadReceiptPdf(receipt.id);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to download PDF");
    }
  };

  const totalPaid = receipt.payments?.reduce(
    (sum, p) => sum + (parseFloat(String(p.amount)) || 0),
    0,
  ) ?? 0;
  const grandTotal = parseFloat(receipt.grandTotal) || 0;
  const changeDue = Math.max(0, totalPaid - grandTotal);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg max-h-[95vh] rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        {/* Screen Header Controls */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50 print:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900">
                Official POS Receipt Preview
              </h3>
              <p className="text-[11px] text-gray-500 font-mono">{receipt.invoiceNumber}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print Thermal (80mm)</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Printable Receipt Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          <div
            id="thermal-receipt"
            className="w-full max-w-[340px] bg-white p-5 rounded-xl shadow-md text-slate-800 font-sans text-xs border border-gray-200 print:shadow-none print:border-none print:w-full print:max-w-none print:p-0"
          >
            {/* Header Branding */}
            <div className="text-center pb-3 border-b border-dashed border-gray-300">
              <h2 className="text-base font-extrabold tracking-tight text-gray-900">
                SmartStore
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                Smartphone & Gadget Retail
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Official Purchase Receipt & Warranty Card
              </p>
            </div>

            {/* Meta Info */}
            <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-gray-300 font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice:</span>
                <span className="font-bold text-gray-900">{receipt.invoiceNumber}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span>{new Date(receipt.saleTime).toLocaleString("id-ID")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cashier:</span>
                <span>{receipt.cashier?.fullName ?? "-"}</span>
              </div>
              {receipt.customer && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer:</span>
                  <span className="font-semibold text-gray-800">
                    {receipt.customer.name}
                    {receipt.customer.phone ? ` (${receipt.customer.phone})` : ""}
                  </span>
                </div>
              )}
            </div>

            {/* Line Items */}
            <div className="py-2.5 space-y-2 border-b border-dashed border-gray-300">
              {receipt.items?.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between font-semibold text-gray-900">
                    <span className="line-clamp-1">{item.productName}</span>
                    <span className="font-mono shrink-0 ml-2">
                      IDR {parseFloat(item.lineTotal).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500 font-mono">
                    <span>
                      {item.qty} x IDR {parseFloat(item.unitPrice).toLocaleString("id-ID")}
                    </span>
                    {parseFloat(item.discountAmount) > 0 && (
                      <span className="text-amber-600">
                        disc -IDR {parseFloat(item.discountAmount).toLocaleString("id-ID")}
                      </span>
                    )}
                  </div>

                  {/* Serialized IMEI Details */}
                  {item.imeis && item.imeis.length > 0 && (
                    <div className="pl-2 space-y-0.5 border-l-2 border-blue-200 mt-1">
                      {item.imeis.map((im, imIdx) => (
                        <div
                          key={imIdx}
                          className="flex flex-wrap items-center gap-1 text-[10.5px] font-mono text-gray-700"
                        >
                          <span className="text-blue-700 font-bold">IMEI: {im.imei}</span>
                          {im.conditionGrade && (
                            <span className="font-sans text-[9.5px] font-semibold bg-blue-50 text-blue-700 px-1 py-0.2 rounded border border-blue-200">
                              {im.conditionGrade}
                            </span>
                          )}
                          {im.batteryHealth != null && (
                            <span className="font-mono text-[9.5px] font-bold bg-emerald-50 text-emerald-700 px-1 py-0.2 rounded border border-emerald-200">
                              {im.batteryHealth}% BH
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Financial Breakdown */}
            <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-gray-300 font-mono">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal:</span>
                <span>IDR {parseFloat(receipt.subtotal).toLocaleString("id-ID")}</span>
              </div>
              {parseFloat(receipt.discountTotal) > 0 && (
                <div className="flex justify-between text-amber-700 font-semibold">
                  <span>Discount:</span>
                  <span>-IDR {parseFloat(receipt.discountTotal).toLocaleString("id-ID")}</span>
                </div>
              )}
              {parseFloat(receipt.taxTotal) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax (PPN):</span>
                  <span>IDR {parseFloat(receipt.taxTotal).toLocaleString("id-ID")}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-gray-900 pt-1 border-t border-gray-100">
                <span>TOTAL:</span>
                <span className="text-emerald-700">
                  IDR {parseFloat(receipt.grandTotal).toLocaleString("id-ID")}
                </span>
              </div>
            </div>

            {/* Payments & Change */}
            <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-gray-300 font-mono">
              {receipt.payments?.map((pay, pIdx) => (
                <div key={pIdx} className="flex justify-between text-gray-700">
                  <span>Payment ({pay.method}):</span>
                  <span>IDR {parseFloat(String(pay.amount)).toLocaleString("id-ID")}</span>
                </div>
              ))}
              {changeDue > 0 && (
                <div className="flex justify-between text-emerald-700 font-bold pt-1">
                  <span>Kembalian / Change:</span>
                  <span>IDR {changeDue.toLocaleString("id-ID")}</span>
                </div>
              )}
            </div>

            {/* Smartphone Warranty & Return Policy */}
            <div className="pt-3 pb-1 space-y-1.5 text-[10px] text-gray-600">
              <div className="text-center font-bold text-gray-800 uppercase tracking-wide">
                🛡️ Ketentuan Garansi & Klaim
              </div>
              <ul className="space-y-0.8 list-disc pl-3 text-[9.5px] leading-snug">
                <li>
                  <strong className="text-gray-800">Unit Second:</strong> Garansi Toko 7 Hari (Fungsional & Hardware).
                </li>
                <li>
                  <strong className="text-gray-800">Unit Baru:</strong> Garansi Resmi Brand/Distributor 1 Tahun.
                </li>
                <li>Segel toko wajib utuh, tidak rusak/robek.</li>
                <li>Garansi gugur bila unit jatuh, masuk cairan, atau human error.</li>
                <li>Wajib membawa struk/nota ini untuk klaim garansi.</li>
              </ul>
              <div className="text-center pt-2 text-[10px] font-semibold text-gray-700">
                Terima kasih atas kunjungan Anda! 🙏
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Print Media Specific CSS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt,
          #thermal-receipt * {
            visibility: visible !important;
          }
          #thermal-receipt {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            padding: 4mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            font-size: 9pt !important;
          }
          @page {
            margin: 0;
            size: 80mm auto;
          }
        }
      `}</style>
    </div>
  );
}
