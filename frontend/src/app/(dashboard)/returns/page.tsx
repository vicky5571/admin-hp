"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function ReturnsPage() {
  const [returns, setReturns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<any>("/returns?limit=50")
      .then((res) => setReturns(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Returns & Refunds
      </h1>
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">Return #</th>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Sale Invoice</th>
              <th className="px-4 py-3 font-medium">Refund Total</th>
              <th className="px-4 py-3 font-medium">Method</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && returns.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No returns yet
                </td>
              </tr>
            )}
            {returns.map((r: any) => (
              <tr key={r.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{r.returnNumber}</td>
                <td className="px-4 py-3">
                  {new Date(r.returnTime).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">{r.sale?.invoiceNumber ?? "-"}</td>
                <td className="px-4 py-3">
                  IDR {parseFloat(r.refundTotal).toLocaleString()}
                </td>
                <td className="px-4 py-3">{r.refundMethod}</td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${
                      r.status === "COMPLETED"
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {r.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}