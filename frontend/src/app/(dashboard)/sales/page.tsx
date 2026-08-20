"use client";

import { useCallback, useEffect, useState } from "react";
import { apiFetch, downloadReceiptPdf, fetchSaleReceipt, ReceiptPayload } from "@/lib/api";
import PrintReceiptModal from "@/components/PrintReceiptModal";

export default function SalesPage() {
  const [sales, setSales] = useState<any[]>([]);
  const [meta, setMeta] = useState<{ page: number; pageCount: number }>({
    page: 1,
    pageCount: 1,
  });
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptPayload | null>(null);
  const [fetchingReceiptId, setFetchingReceiptId] = useState<number | null>(null);

  const load = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const res = await apiFetch<any>(`/sales?page=${page}&limit=20`);
      setSales(res.data ?? []);
      setMeta((res.meta as any) ?? { page: 1, pageCount: 1 });
    } catch {
      // silent – keep previous data visible
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(1);
  }, [load]);

  const handleOpenReceipt = async (saleId: number) => {
    setFetchingReceiptId(saleId);
    try {
      const res = await fetchSaleReceipt(saleId);
      setSelectedReceipt(res.data);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to load receipt");
    } finally {
      setFetchingReceiptId(null);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4 sm:mb-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sales Transactions</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit store sales, inspect serialized IMEI records, and reprint receipts or download warranty invoices.
          </p>
        </div>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap">Invoice</th>
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Cashier</th>
                <th className="px-4 py-3 font-medium">Items</th>
                <th className="px-4 py-3 font-medium">Total</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && sales.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                    No sales yet
                  </td>
                </tr>
              )}
              {sales.map((s: any) => (
                <tr key={s.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium font-mono text-blue-700">{s.invoiceNumber}</td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {new Date(s.saleTime).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3 text-xs">{s.cashier?.fullName ?? "-"}</td>
                  <td className="px-4 py-3 text-xs font-semibold">{s.items?.length ?? 0}</td>
                  <td className="px-4 py-3 font-medium font-mono">
                    IDR {parseFloat(s.grandTotal).toLocaleString("id-ID")}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                        s.status === "COMPLETED"
                          ? "bg-green-100 text-green-700"
                          : s.status === "VOIDED"
                            ? "bg-red-100 text-red-700"
                            : "bg-yellow-100 text-yellow-700"
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenReceipt(s.id)}
                        disabled={fetchingReceiptId === s.id}
                        className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                        </svg>
                        <span>{fetchingReceiptId === s.id ? "Loading..." : "Receipt"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadReceiptPdf(s.id)}
                        className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 border border-gray-300 transition-colors"
                      >
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        <span>PDF</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {meta.pageCount > 1 && (
        <div className="flex items-center justify-between mt-4">
          <span className="text-sm text-gray-500">
            Page {meta.page} of {meta.pageCount}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => load(meta.page - 1)}
              disabled={meta.page <= 1}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              onClick={() => load(meta.page + 1)}
              disabled={meta.page >= meta.pageCount}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-gray-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Printable Receipt Modal */}
      <PrintReceiptModal
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
        receipt={selectedReceipt}
      />
    </div>
  );
}

