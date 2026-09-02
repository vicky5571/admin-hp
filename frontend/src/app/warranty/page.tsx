"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { lookupWarranty, WarrantyLookupResult } from "@/lib/api";

function WarrantyPortalContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || searchParams.get("imei") || "";

  const [query, setQuery] = useState(initialQuery);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<WarrantyLookupResult | null>(null);
  const [copiedImei, setCopiedImei] = useState(false);

  const handleSearch = useCallback(async (searchKey: string) => {
    const clean = searchKey.trim();
    if (!clean) return;

    setLoading(true);
    setError(null);

    try {
      const res = await lookupWarranty(clean);
      setResult(res.data);
    } catch (err: any) {
      setResult(null);
      setError(
        err?.message ||
          `Data garansi untuk "${clean}" tidak ditemukan. Pastikan IMEI atau Nomor Invoice sudah sesuai.`
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (initialQuery) {
      handleSearch(initialQuery);
    }
  }, [initialQuery, handleSearch]);

  const onFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      handleSearch(query);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedImei(true);
    setTimeout(() => setCopiedImei(false), 2000);
  };

  const handleClaimWhatsApp = () => {
    if (!result) return;
    const supportNum = result.policy.supportWhatsApp || "6281234567890";
    const msg = [
      `Halo Customer Care SmartStore, saya ingin konsultasi klaim garansi:`,
      `• Unit: *${result.device.productName}*`,
      `• IMEI: *${result.device.imei || "N/A"}*`,
      `• Invoice: *${result.invoice.invoiceNumber}*`,
      `• Tanggal Pembelian: ${new Date(result.invoice.saleTime).toLocaleDateString("id-ID")}`,
      `• Masa Garansi: ${result.warranty.status === "ACTIVE" ? "AKTIF" : "KEDALUWARSA"} (${result.warranty.remainingDays} hari tersisa)`,
      ``,
      `Kendala pada perangkat: `,
    ].join("\n");

    const url = `https://wa.me/${supportNum}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans antialiased">
      {/* Header Bar */}
      <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-600 via-blue-600 to-indigo-600 text-white font-bold shadow-md shadow-blue-500/20">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <span className="text-sm font-bold text-slate-900 tracking-tight">SmartStore</span>
              <span className="ml-1.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                WARRANTY
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="text-xs font-semibold text-slate-600 hover:text-blue-600 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors"
            >
              Dashboard Kasir →
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Search Section */}
      <section className="bg-gradient-to-b from-white via-slate-50 to-slate-100 py-10 sm:py-14 border-b border-slate-200 px-4">
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700 border border-blue-200 shadow-2xs">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse"></span>
            <span>Verifikasi Garansi Resmi & Serial Device</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Cek Status Garansi Smartphone
          </h1>

          <p className="text-sm text-slate-600 max-w-lg mx-auto">
            Masukkan 15 digit nomor IMEI perangkat atau nomor nota invoice Anda untuk melihat status aktif, tanggal kedaluwarsa, dan syarat klaim garansi.
          </p>

          {/* Search Form */}
          <form onSubmit={onFormSubmit} className="pt-2">
            <div className="relative flex items-center shadow-lg rounded-2xl bg-white border border-slate-300 focus-within:border-blue-600 focus-within:ring-4 focus-within:ring-blue-500/15 transition-all p-1.5">
              <div className="pl-3.5 text-slate-400">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>

              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Ketik 15 Digit IMEI (misal: 356789...) atau No. Invoice (INV-...)"
                className="w-full bg-transparent px-3 py-2.5 text-sm text-slate-900 placeholder-slate-400 outline-none font-mono"
              />

              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-lg"
                >
                  ✕
                </button>
              )}

              <button
                type="submit"
                disabled={loading || !query.trim()}
                className="rounded-xl bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 text-white font-semibold text-xs px-5 py-3 shadow-md shadow-blue-500/25 transition-all shrink-0"
              >
                {loading ? "Memeriksa..." : "Periksa Garansi"}
              </button>
            </div>

            <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500 mt-2.5">
              <span>Tips:</span>
              <span>Ketik <code className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-700">*#06#</code> di dialer ponsel Anda untuk melihat nomor IMEI.</span>
            </div>
          </form>
        </div>
      </section>

      {/* Result Container */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
        {loading && (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 shadow-sm space-y-3">
            <div className="inline-block h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-sm font-medium text-slate-600">Menghubungkan ke database SmartStore ERP...</p>
          </div>
        )}

        {error && !loading && (
          <div className="p-6 bg-rose-50 border border-rose-200 rounded-3xl text-center space-y-2">
            <div className="text-2xl">⚠️</div>
            <h3 className="text-sm font-bold text-rose-900">Data Garansi Tidak Ditemukan</h3>
            <p className="text-xs text-rose-700 max-w-md mx-auto">{error}</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-6">
            {/* Warranty Certificate Card */}
            <div className="rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden">
              {/* Card Banner */}
              <div
                className={`p-6 sm:p-8 text-white ${
                  result.warranty.status === "ACTIVE"
                    ? "bg-gradient-to-r from-emerald-600 via-emerald-700 to-teal-700"
                    : "bg-gradient-to-r from-slate-800 via-rose-900 to-slate-900"
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-white/20 backdrop-blur-xs px-3 py-1 text-xs font-semibold uppercase tracking-wider mb-2">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          result.warranty.status === "ACTIVE" ? "bg-white animate-pulse" : "bg-rose-400"
                        }`}
                      ></span>
                      <span>
                        {result.warranty.status === "ACTIVE" ? "GARANSI RESMI AKTIF" : "MASA GARANSI BERAKHIR"}
                      </span>
                    </div>

                    <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                      {result.device.productName}
                    </h2>
                    <p className="text-sm text-white/80 font-medium mt-1">
                      {result.warranty.warrantyType}
                    </p>
                  </div>

                  {/* Countdown Badge */}
                  <div className="sm:text-right bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20">
                    <span className="text-xs text-white/80 uppercase font-semibold tracking-wider block">
                      Sisa Masa Garansi
                    </span>
                    <span className="text-3xl font-black tracking-tight">
                      {result.warranty.status === "ACTIVE"
                        ? `${result.warranty.remainingDays} Hari`
                        : "Kedaluwarsa"}
                    </span>
                    <span className="text-[11px] text-white/70 block mt-0.5">
                      Berakhir: {new Date(result.warranty.expiryDate).toLocaleDateString("id-ID", { dateStyle: "long" })}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-6 pt-4 border-t border-white/15">
                  <div className="flex justify-between text-xs text-white/80 font-medium mb-1.5">
                    <span>Mulai: {new Date(result.warranty.purchaseDate).toLocaleDateString("id-ID")}</span>
                    <span>{result.warranty.coveragePercent}% Masa Berjalan ({result.warranty.elapsedDays} hari)</span>
                    <span>Berakhir: {new Date(result.warranty.expiryDate).toLocaleDateString("id-ID")}</span>
                  </div>
                  <div className="h-2 w-full bg-white/20 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        result.warranty.status === "ACTIVE" ? "bg-white" : "bg-rose-400"
                      }`}
                      style={{ width: `${result.warranty.coveragePercent}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Certificate Body */}
              <div className="p-6 sm:p-8 space-y-6">
                {/* Specifications Grid */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Spesifikasi Perangkat
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-medium block">Nomor IMEI / Serial</span>
                      <div className="flex items-center justify-between mt-1">
                        <span className="font-mono text-xs font-bold text-slate-900 truncate">
                          {result.device.imei || "Non-Serialized"}
                        </span>
                        {result.device.imei && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(result.device.imei || "")}
                            className="text-[10px] text-blue-600 font-semibold hover:underline shrink-0 ml-1"
                          >
                            {copiedImei ? "✓" : "Salin"}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-medium block">Kondisi Device</span>
                      <span className="text-xs font-bold text-slate-900 mt-1 block">
                        {result.device.conditionGrade}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-medium block">Brand & SKU</span>
                      <span className="text-xs font-bold text-slate-900 mt-1 block truncate">
                        {result.device.brand} ({result.device.sku})
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-medium block">Baterai Health</span>
                      <span className="text-xs font-bold text-slate-900 mt-1 block">
                        {result.device.batteryHealth ? `${result.device.batteryHealth}%` : "Normal (100%)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Purchase & Invoice Details */}
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
                    Informasi Pembelian
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-medium block">Nomor Invoice</span>
                      <span className="font-mono text-xs font-bold text-slate-900 mt-1 block">
                        {result.invoice.invoiceNumber}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-medium block">Cabang Toko</span>
                      <span className="text-xs font-bold text-slate-900 mt-1 block">
                        {result.invoice.storeBranch}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <span className="text-[11px] text-slate-500 font-medium block">Nama Pemilik</span>
                      <span className="text-xs font-bold text-slate-900 mt-1 block">
                        {result.invoice.customerName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-2 flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={handleClaimWhatsApp}
                    className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold text-xs px-6 py-3.5 shadow-md shadow-emerald-500/20 transition-all"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                    <span>Klaim Garansi via WhatsApp</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white font-bold text-xs px-6 py-3.5 shadow-sm transition-all"
                  >
                    <span>🖨️</span>
                    <span>Cetak Kartu Garansi</span>
                  </button>
                </div>

                {/* Terms and Exclusions */}
                <div className="pt-4 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-800 mb-2">
                    Syarat & Ketentuan Klaim Garansi:
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600">
                    {result.policy.terms.map((term, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-blue-600 font-bold">•</span>
                        <span>{term}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function WarrantyPortalPage() {
  return (
    <Suspense fallback={<div className="p-10 text-center text-xs text-slate-500">Loading warranty portal...</div>}>
      <WarrantyPortalContent />
    </Suspense>
  );
}
