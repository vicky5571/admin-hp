"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ReceiptPayload, downloadReceiptPdf, fetchSettings } from "@/lib/api";
import {
  buildWhatsAppReceiptMessage,
  getWhatsAppShareUrl,
  resolveStoreOwnerWhatsApp,
} from "@/lib/whatsapp";

interface PrintReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  receipt: ReceiptPayload | null;
}

const formatInitialPhone = (rawPhone?: string | null): string => {
  if (!rawPhone) return "";
  const trimmed = rawPhone.trim();
  if (trimmed.startsWith("+62")) return trimmed.slice(3);
  if (trimmed.startsWith("62")) return trimmed.slice(2);
  if (trimmed.startsWith("0")) return trimmed.slice(1);
  return trimmed;
};

export default function PrintReceiptModal({
  isOpen,
  onClose,
  receipt,
}: PrintReceiptModalProps) {
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [phone, setPhone] = useState(formatInitialPhone(receipt?.customer?.phone));
  const [storeSettings, setStoreSettings] = useState<Record<string, string>>({});
  const phoneInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchSettings()
      .then((res) => {
        if (res.data) setStoreSettings(res.data);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    setPhone(formatInitialPhone(receipt?.customer?.phone));
  }, [receipt]);

  useEffect(() => {
    if (showWhatsApp) {
      setTimeout(() => {
        phoneInputRef.current?.focus();
      }, 50);
    }
  }, [showWhatsApp]);

  if (!isOpen || !receipt) return null;

  const effectiveStoreName =
    receipt.store?.name ||
    storeSettings.STORE_NAME ||
    "SmartStore";
  const effectiveStoreAddress =
    receipt.store?.address ||
    storeSettings.STORE_ADDRESS ||
    "Smartphone & Gadget Retail";
  const effectiveStorePhone =
    receipt.store?.phone ||
    storeSettings.STORE_PHONE ||
    "+62 812-3456-7890";
  const effectiveOwnerWhatsApp = resolveStoreOwnerWhatsApp(
    receipt.store?.ownerWhatsApp || storeSettings.STORE_OWNER_WHATSAPP,
  );

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

  const totalPaid =
    receipt.payments?.reduce(
      (sum, p) => sum + (parseFloat(String(p.amount)) || 0),
      0,
    ) ?? 0;
  const grandTotal = parseFloat(receipt.grandTotal) || 0;
  const changeDue = Math.max(0, totalPaid - grandTotal);

  // Extract first IMEI or Invoice for warranty link
  let lookupQuery = receipt.invoiceNumber;
  if (receipt.items) {
    for (const it of receipt.items) {
      if (it.imeis && it.imeis.length > 0) {
        lookupQuery = it.imeis[0].imei;
        break;
      }
    }
  }

  const generateReceiptText = () => {
    const itemsForWa = (receipt.items || []).map((it) => ({
      name: it.productName,
      qty: it.qty,
      unitPrice: parseFloat(it.unitPrice) || 0,
      lineTotal: parseFloat(it.lineTotal) || 0,
      imeis: it.imeis?.map((im) => im.imei) || [],
    }));

    return buildWhatsAppReceiptMessage({
      invoiceNumber: receipt.invoiceNumber,
      saleTime: receipt.saleTime,
      cashierName: receipt.cashier?.fullName || "Staff Kasir",
      customerName: receipt.customer?.name,
      items: itemsForWa,
      subtotal: parseFloat(receipt.subtotal) || grandTotal,
      discountTotal: parseFloat(receipt.discountTotal) || 0,
      taxTotal: parseFloat(receipt.taxTotal) || 0,
      grandTotal: grandTotal,
      paymentMethod: receipt.payments?.[0]?.method || "CASH",
      paidTotal: totalPaid,
      change: changeDue,
      storeName: effectiveStoreName,
      storeAddress: effectiveStoreAddress,
      storePhone: effectiveStorePhone,
    });
  };

  const handleSendWhatsApp = () => {
    const message = generateReceiptText();
    const shareUrl = getWhatsAppShareUrl(phone, message);
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  const handleSendToOwner = () => {
    if (!effectiveOwnerWhatsApp) {
      alert(
        "Nomor WhatsApp Owner belum diisi.\nSilakan atur di menu Settings > Store & Business Profile ('Owner WhatsApp Number') atau isi environment variable NEXT_PUBLIC_STORE_OWNER_WHATSAPP.",
      );
      return;
    }
    const message = generateReceiptText();
    const shareUrl = getWhatsAppShareUrl(
      effectiveOwnerWhatsApp,
      `[SALINAN NOTA OWNER]\n${message}`,
    );
    window.open(shareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-xs">
      <div className="w-full max-w-lg max-h-[95vh] rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        {/* Screen Header Controls */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50 print:hidden">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h3 className="text-xs font-bold text-gray-900">
                Official POS Receipt Preview
              </h3>
              <p className="text-[11px] text-gray-500 font-mono">
                {receipt.invoiceNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={() => setShowWhatsApp((prev) => !prev)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                showWhatsApp
                  ? "bg-emerald-700 text-white ring-2 ring-emerald-400/50 shadow-inner"
                  : "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700"
              }`}
              title="Kirim ke WhatsApp"
            >
              <span>WA</span>
              <span className="hidden sm:inline">WhatsApp</span>
              <span className="text-[10px] ml-0.5">
                {showWhatsApp ? "▲" : "▼"}
              </span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                />
              </svg>
              <span>Print</span>
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200 transition-colors"
            >
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              <span>PDF</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-200 hover:text-gray-600"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* WhatsApp Receipt & Digital Warranty Inline Box */}
        {showWhatsApp && (
          <div className="border-b border-sky-100 bg-sky-50/70 p-3.5 sm:p-4 text-left space-y-3 print:hidden transition-all">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white text-xs font-bold shadow-xs">
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
              <div className="flex items-center gap-2.5">
                <Link
                  href={`/warranty?q=${encodeURIComponent(lookupQuery)}`}
                  target="_blank"
                  className="text-[11px] font-semibold text-sky-600 hover:text-sky-700 hover:underline flex items-center gap-1"
                >
                  <span>Lihat Garansi</span>
                  <span>↗</span>
                </Link>
                <button
                  type="button"
                  onClick={() => setShowWhatsApp(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/60 transition-colors"
                  title="Tutup Form WhatsApp"
                >
                  <svg
                    className="w-3.5 h-3.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <div className="relative flex-1">
                <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-mono">
                  +62
                </span>
                <input
                  ref={phoneInputRef}
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleSendWhatsApp();
                    }
                  }}
                  placeholder="812-3456-7890 (Nomor WhatsApp)"
                  className="w-full h-9 rounded-xl bg-white border border-sky-200/80 pl-11 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400/25"
                />
              </div>
              <button
                type="button"
                onClick={handleSendWhatsApp}
                className="h-9 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold shadow-sm flex items-center justify-center gap-2 transition-colors shrink-0"
              >
                <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                <span>Kirim Pelanggan</span>
              </button>
              <button
                type="button"
                onClick={handleSendToOwner}
                className="h-9 px-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-black text-white text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors shrink-0"
                title="Kirim salinan nota ke nomor WhatsApp Owner"
              >
                <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                  <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                </svg>
                <span>Owner</span>
              </button>
            </div>
          </div>
        )}

        {/* Scrollable Printable Receipt Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-100 flex justify-center">
          <div
            id="thermal-receipt"
            className="w-full max-w-[340px] bg-white p-5 rounded-xl shadow-md text-slate-800 font-sans text-xs border border-gray-200 print:shadow-none print:border-none print:w-full print:max-w-none print:p-0"
          >
            {/* Header Branding */}
            <div className="text-center pb-3 border-b border-dashed border-gray-300">
              <h2 className="text-base font-extrabold tracking-tight text-gray-900">
                {effectiveStoreName}
              </h2>
              <p className="text-[11px] text-gray-500 font-medium">
                {effectiveStoreAddress}
              </p>
              {effectiveStorePhone && (
                <p className="text-[10px] text-gray-500 font-mono mt-0.5">
                  Telp/WA: {effectiveStorePhone}
                </p>
              )}
              <p className="text-[10px] text-gray-400 mt-0.5">
                Official Purchase Receipt & Warranty Card
              </p>
            </div>

            {/* Meta Info */}
            <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-gray-300 font-mono">
              <div className="flex justify-between">
                <span className="text-gray-500">Invoice:</span>
                <span className="font-bold text-gray-900">
                  {receipt.invoiceNumber}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date:</span>
                <span>
                  {new Date(receipt.saleTime).toLocaleString("id-ID")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Cashier:</span>
                <span>{receipt.cashier?.fullName ?? "-"}</span>
              </div>
              {receipt.salesPerson &&
                receipt.salesPerson.fullName !== receipt.cashier?.fullName && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Sales:</span>
                    <span className="font-semibold text-gray-800">
                      {receipt.salesPerson.fullName}
                    </span>
                  </div>
                )}
              {receipt.customer && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Customer:</span>
                  <span className="font-semibold text-gray-800">
                    {receipt.customer.name}
                    {receipt.customer.phone
                      ? ` (${receipt.customer.phone})`
                      : ""}
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
                      IDR{" "}
                      {(
                        parseFloat(String(item.lineTotal || 0)) || 0
                      ).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-gray-500 font-mono">
                    <span>
                      {item.qty} x IDR{" "}
                      {(
                        parseFloat(String(item.unitPrice || 0)) || 0
                      ).toLocaleString("id-ID")}
                    </span>
                    {parseFloat(String(item.discountAmount || 0)) > 0 && (
                      <span className="text-amber-600">
                        disc -IDR{" "}
                        {(
                          parseFloat(String(item.discountAmount || 0)) || 0
                        ).toLocaleString("id-ID")}
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
                          <span className="text-blue-700 font-bold">
                            IMEI: {im.imei}
                          </span>
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
                <span>
                  IDR {parseFloat(receipt.subtotal).toLocaleString("id-ID")}
                </span>
              </div>
              {parseFloat(receipt.discountTotal) > 0 && (
                <div className="flex justify-between text-amber-700 font-semibold">
                  <span>Discount:</span>
                  <span>
                    -IDR{" "}
                    {parseFloat(receipt.discountTotal).toLocaleString("id-ID")}
                  </span>
                </div>
              )}
              {parseFloat(receipt.taxTotal) > 0 && (
                <div className="flex justify-between text-gray-600">
                  <span>Tax (PPN):</span>
                  <span>
                    IDR {parseFloat(receipt.taxTotal).toLocaleString("id-ID")}
                  </span>
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
                  <span>
                    IDR {parseFloat(String(pay.amount)).toLocaleString("id-ID")}
                  </span>
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
                  <strong className="text-gray-800">Unit Second:</strong>{" "}
                  Garansi Toko 7 Hari (Fungsional & Hardware).
                </li>
                <li>
                  <strong className="text-gray-800">Unit Baru:</strong> Garansi
                  Resmi Brand/Distributor 1 Tahun.
                </li>
                <li>Segel toko wajib utuh, tidak rusak/robek.</li>
                <li>
                  Garansi gugur bila unit jatuh, masuk cairan, atau human error.
                </li>
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
