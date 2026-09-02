"use client";

import { useState } from "react";
import Link from "next/link";
import { downloadReceiptPdf, ReceiptPayload } from "@/lib/api";
import { buildWhatsAppReceiptMessage, getWhatsAppShareUrl } from "@/lib/whatsapp";

interface PosCompletedSaleProps {
  saleResult: any;
  receiptPayload?: ReceiptPayload | null;
  onPrintReceipt: () => void;
  onNewSale: () => void;
}

export default function PosCompletedSale({
  saleResult,
  receiptPayload,
  onPrintReceipt,
  onNewSale,
}: PosCompletedSaleProps) {
  if (!saleResult) return null;

  const grandTotalNum = parseFloat(saleResult.grandTotal) || 0;
  const paidTotalNum = parseFloat(saleResult.paidTotal) || grandTotalNum;
  const changeNum = parseFloat(saleResult.change) || 0;

  // Auto-fill customer phone if available
  const initialPhone =
    receiptPayload?.customer?.phone ||
    saleResult.customer?.phone ||
    "";
  const [phone, setPhone] = useState(initialPhone);
  const [copied, setCopied] = useState(false);

  // Extract first IMEI or Invoice for warranty link
  let lookupQuery = saleResult.invoiceNumber;
  if (receiptPayload?.items) {
    for (const it of receiptPayload.items) {
      if (it.imeis && it.imeis.length > 0) {
        lookupQuery = it.imeis[0].imei;
        break;
      }
    }
  }

  const handleSendWhatsApp = () => {
    let itemsForWa = [];
    if (receiptPayload?.items) {
      itemsForWa = receiptPayload.items.map((it) => ({
        name: it.productName,
        qty: it.qty,
        unitPrice: parseFloat(it.unitPrice) || 0,
        lineTotal: parseFloat(it.lineTotal) || 0,
        imeis: it.imeis?.map((im) => im.imei) || [],
      }));
    } else if (saleResult.items) {
      itemsForWa = saleResult.items.map((it: any) => ({
        name: it.product?.name || it.productName || "Item",
        qty: it.qty || 1,
        unitPrice: parseFloat(it.unitPrice) || 0,
        lineTotal: parseFloat(it.lineTotal || it.subtotal) || 0,
        imeis: it.imeis || [],
      }));
    }

    const message = buildWhatsAppReceiptMessage({
      invoiceNumber: saleResult.invoiceNumber,
      saleTime: saleResult.saleTime || new Date(),
      cashierName: receiptPayload?.cashier?.fullName || "Staff Kasir",
      customerName: receiptPayload?.customer?.name || saleResult.customer?.name,
      items: itemsForWa,
      subtotal: parseFloat(receiptPayload?.subtotal || saleResult.subtotal) || grandTotalNum,
      discountTotal: parseFloat(receiptPayload?.discountTotal || saleResult.discountTotal) || 0,
      taxTotal: parseFloat(receiptPayload?.taxTotal || saleResult.taxTotal) || 0,
      grandTotal: grandTotalNum,
      paymentMethod:
        receiptPayload?.payments?.[0]?.method ||
        saleResult.payments?.[0]?.method ||
        "CASH",
      paidTotal: paidTotalNum,
      change: changeNum,
      storeName: "SmartStore Central",
      storeAddress: "Jl. Sudirman No. 45, Jakarta",
      storePhone: "+62 812-3456-7890",
    });

    const shareUrl = getWhatsAppShareUrl(phone, message);
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const handleCopyWarrantyLink = () => {
    const url = `${window.location.origin}/warranty?q=${encodeURIComponent(lookupQuery)}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-xl mx-auto mt-4 text-center">
      <div className="rounded-3xl bg-white p-6 sm:p-8 shadow-xl border border-slate-200/80 space-y-5">
        {/* Success Icon */}
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 text-3xl mx-auto shadow-xs border border-emerald-100">
          ✓
        </div>

        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Transaction Complete!
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-1 flex items-center justify-center gap-1.5">
            <span>Invoice:</span>
            <span className="font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
              {saleResult.invoiceNumber}
            </span>
            {saleResult.isOffline && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-100 text-amber-800">
                OFFLINE SAVED
              </span>
            )}
          </p>
        </div>

        {/* Financial Summary */}
        <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 text-xs space-y-2 text-left font-mono">
          <div className="flex justify-between text-slate-600 font-sans">
            <span>Grand Total:</span>
            <span className="font-bold text-slate-900 font-mono text-sm">
              Rp {grandTotalNum.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex justify-between text-slate-600 font-sans">
            <span>Amount Tendered:</span>
            <span className="font-bold text-blue-700 font-mono">
              Rp {paidTotalNum.toLocaleString("id-ID")}
            </span>
          </div>

          <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-sans">
            <span className="font-bold text-emerald-800">
              Change Due (Kembalian):
            </span>
            <span className="font-black text-emerald-600 font-mono text-base">
              Rp {changeNum.toLocaleString("id-ID")}
            </span>
          </div>
        </div>

        {/* WhatsApp Receipt & Digital Warranty Box */}
        <div className="rounded-2xl border border-emerald-200/90 bg-emerald-50/40 p-4 text-left space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white text-sm font-bold shadow-xs">
                WA
              </span>
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  Kirim Struk Digital via WhatsApp
                </h4>
                <p className="text-[11px] text-slate-500">
                  Termasuk rincian nomor IMEI & link kartu garansi online
                </p>
              </div>
            </div>
            <Link
              href={`/warranty?q=${encodeURIComponent(lookupQuery)}`}
              target="_blank"
              className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1"
            >
              <span>Lihat Garansi</span>
              <span>↗</span>
            </Link>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">
                +62
              </span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="812-3456-7890 (Nomor WhatsApp)"
                className="w-full h-9 rounded-xl bg-white border border-emerald-200 pl-11 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              />
            </div>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-colors shrink-0"
            >
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
              </svg>
              <span>Kirim WhatsApp</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
            <span>Link garansi instan untuk customer:</span>
            <button
              type="button"
              onClick={handleCopyWarrantyLink}
              className="text-emerald-700 hover:underline font-medium flex items-center gap-1"
            >
              {copied ? "✓ Tersalin!" : "📋 Salin Link"}
            </button>
          </div>
        </div>

        {/* Standard Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <button
            type="button"
            onClick={onPrintReceipt}
            className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-xs font-bold text-white hover:bg-slate-800 shadow-sm transition-colors"
          >
            <span>🖨️</span>
            <span>Print Struk</span>
          </button>

          {!saleResult.isOffline && (
            <button
              type="button"
              onClick={() => downloadReceiptPdf(saleResult.id)}
              className="flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-100 border border-slate-200 shadow-2xs transition-colors"
            >
              <span>📄</span>
              <span>Download PDF</span>
            </button>
          )}

          <button
            type="button"
            onClick={onNewSale}
            className="flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white hover:bg-blue-700 shadow-sm shadow-blue-500/25 transition-colors"
          >
            <span>+</span>
            <span>Transaksi Baru (F2)</span>
          </button>
        </div>
      </div>
    </div>
  );
}
