"use client";

import { useCallback, useEffect, useState } from "react";
import {
  downloadReportCsv,
  fetchSalesSummary,
  fetchGrossProfit,
  fetchReturnsSummary,
} from "@/lib/api";

// Returns today's date as YYYY-MM-DD in local time
function today() {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

// Returns date N days before today as YYYY-MM-DD
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}

const QUICK_RANGES = [
  { label: "Today", from: () => today(), to: () => today() },
  { label: "Yesterday", from: () => daysAgo(1), to: () => daysAgo(1) },
  { label: "Last 7 days", from: () => daysAgo(6), to: () => today() },
  { label: "Last 30 days", from: () => daysAgo(29), to: () => today() },
  { label: "This month", from: () => today().slice(0, 7) + "-01", to: () => today() },
  { label: "All time", from: () => "", to: () => "" },
];

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(daysAgo(29));
  const [dateTo, setDateTo] = useState(today());
  const [activeQuick, setActiveQuick] = useState("Last 30 days");

  const [salesData, setSalesData] = useState<any[]>([]);
  const [profitData, setProfitData] = useState<any>(null);
  const [returnsData, setReturnsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const load = useCallback(
    async (from: string, to: string) => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          dateFrom: from || undefined,
          dateTo: to || undefined,
        };
        const [sales, profit, returns] = await Promise.all([
          fetchSalesSummary({ period: "daily", ...params }),
          fetchGrossProfit(params),
          fetchReturnsSummary(params),
        ]);
        setSalesData(sales.data.data ?? []);
        setProfitData(profit.data);
        setReturnsData(returns.data);
      } catch (err: any) {
        setError(err?.message || "Failed to load report data. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(dateFrom, dateTo);
  }, [load, dateFrom, dateTo]);

  const applyQuick = (range: (typeof QUICK_RANGES)[number]) => {
    const from = range.from();
    const to = range.to();
    setDateFrom(from);
    setDateTo(to);
    setActiveQuick(range.label);
  };

  // Build CSV download path with query parameters
  const getCsvUrl = (basePath: string, noDate?: boolean) => {
    const [path, existingQuery] = basePath.split("?");
    const params = new URLSearchParams(existingQuery || "");
    if (!noDate) {
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
    }
    const qs = params.toString();
    return qs ? `${path}?${qs}` : path;
  };

  const handleDownloadCsv = async (path: string, filename: string, noDate?: boolean) => {
    try {
      setDownloadingFile(filename);
      const url = getCsvUrl(path, noDate);
      await downloadReportCsv(url, filename);
    } catch {
      alert(`Failed to download ${filename}.`);
    } finally {
      setDownloadingFile(null);
    }
  };

  const rangeLabel =
    dateFrom && dateTo
      ? dateFrom === dateTo
        ? dateFrom
        : `${dateFrom} → ${dateTo}`
      : dateFrom
        ? `From ${dateFrom}`
        : dateTo
          ? `Until ${dateTo}`
          : "All time";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Reports</h1>
          {!loading && (
            <p className="text-xs text-gray-500 mt-1">
              Showing data for: <span className="font-medium text-gray-700">{rangeLabel}</span>
            </p>
          )}
        </div>

        {/* CSV Downloads */}
        <div className="flex flex-wrap gap-2">
          {[
            {
              label: "Sales Summary",
              path: `/reports/sales-summary/csv?period=daily`,
              file: "sales-summary.csv",
            },
            { label: "Sales by Product", path: "/reports/sales-by-product/csv", file: "sales-by-product.csv" },
            { label: "Sales by Cashier", path: "/reports/sales-by-cashier/csv", file: "sales-by-cashier.csv" },
            { label: "Payment Breakdown", path: "/reports/payment-breakdown/csv", file: "payment-breakdown.csv" },
            { label: "Gross Profit", path: "/reports/gross-profit/csv", file: "gross-profit.csv" },
            { label: "Stock on Hand", path: "/reports/stock-on-hand/csv", file: "stock-on-hand.csv", noDate: true },
            { label: "Returns Summary", path: "/reports/returns-summary/csv", file: "returns-summary.csv" },
          ].map(({ label, path, file, noDate }) => (
            <button
              key={file}
              disabled={downloadingFile === file}
              onClick={() => handleDownloadCsv(path, file, noDate)}
              className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium hover:bg-gray-200 flex items-center gap-1 transition-colors text-gray-700 hover:text-gray-900 disabled:opacity-50"
            >
              {downloadingFile === file ? (
                <span className="inline-block w-3 h-3 border-2 border-gray-500 border-t-transparent rounded-full animate-spin" />
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              )}
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Quick range pills */}
          <div className="flex flex-wrap gap-2">
            {QUICK_RANGES.map((r) => (
              <button
                key={r.label}
                onClick={() => applyQuick(r)}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  activeQuick === r.label
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>

          {/* Manual date inputs */}
          <div className="flex items-center gap-2 sm:ml-auto">
            <label className="text-xs font-medium text-gray-500 whitespace-nowrap">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setActiveQuick("");
              }}
              className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
            <label className="text-xs font-medium text-gray-500">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setActiveQuick("");
              }}
              className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-700 flex items-center justify-between">
          <span>{error}</span>
          <button
            onClick={() => load(dateFrom, dateTo)}
            className="text-xs font-semibold text-red-800 underline hover:no-underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="text-center py-12 text-gray-400 text-sm">Loading reports…</div>
      )}

      {!loading && !error && (
        <>
          {/* Gross Profit Summary */}
          {profitData?.summary && (
            <div className="rounded-xl bg-white p-4 sm:p-6 shadow-sm border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                Gross Profit Summary
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Revenue</p>
                  <p className="text-xl font-bold text-green-600">
                    IDR {parseFloat(profitData.summary.totalRevenue).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cost</p>
                  <p className="text-xl font-bold text-red-600">
                    IDR {parseFloat(profitData.summary.totalCost).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gross Profit</p>
                  <p className="text-xl font-bold text-blue-600">
                    IDR {parseFloat(profitData.summary.totalGrossProfit).toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Margin</p>
                  <p className="text-xl font-bold text-indigo-600">
                    {profitData.summary.overallMargin}%
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Daily Sales */}
          <div className="rounded-xl bg-white p-4 sm:p-6 shadow-sm border border-gray-200">
            <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
              Daily Sales
            </h2>
            {salesData.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">
                No sales data for the selected period.
              </p>
            ) : (
              <div className="overflow-x-auto -mx-4 sm:mx-0">
                <div className="inline-block min-w-full align-middle px-4 sm:px-0">
                  <table className="w-full text-sm whitespace-nowrap">
                    <thead>
                      <tr className="border-b border-gray-200 text-left text-gray-500">
                        <th className="py-2 pr-6 font-medium">Date</th>
                        <th className="py-2 pr-6 font-medium">Transactions</th>
                        <th className="py-2 pr-6 font-medium">Subtotal</th>
                        <th className="py-2 pr-6 font-medium">Discount</th>
                        <th className="py-2 pr-6 font-medium">Tax</th>
                        <th className="py-2 pr-6 font-medium">Grand Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {salesData.map((row: any, i: number) => (
                        <tr key={i} className="border-b border-gray-100">
                          <td className="py-2 pr-6">
                            {new Date(row.period_start).toLocaleDateString()}
                          </td>
                          <td className="py-2 pr-6">{row.transaction_count}</td>
                          <td className="py-2 pr-6">
                            IDR {parseFloat(row.subtotal).toLocaleString()}
                          </td>
                          <td className="py-2 pr-6">
                            IDR {parseFloat(row.discount_total).toLocaleString()}
                          </td>
                          <td className="py-2 pr-6">
                            IDR {parseFloat(row.tax_total).toLocaleString()}
                          </td>
                          <td className="py-2 pr-6 font-medium">
                            IDR {parseFloat(row.grand_total).toLocaleString()}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Returns Summary */}
          {returnsData && (
            <div className="rounded-xl bg-white p-4 sm:p-6 shadow-sm border border-gray-200">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
                Returns Summary
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-sm text-gray-500">Total Returns</p>
                  <p className="text-xl font-bold">
                    {returnsData.summary.totalReturns}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Total Refunded</p>
                  <p className="text-xl font-bold text-red-600">
                    IDR {parseFloat(returnsData.summary.totalRefunded).toLocaleString()}
                  </p>
                </div>
              </div>

              {returnsData.byMethod?.length > 0 && (
                <>
                  <h3 className="text-sm font-medium text-gray-700 mb-2">By Method</h3>
                  <div className="space-y-2">
                    {returnsData.byMethod.map((m: any, i: number) => (
                      <div
                        key={i}
                        className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2"
                      >
                        <span className="font-medium">{m.refund_method}</span>
                        <span className="text-sm">
                          {m.return_count} returns, IDR{" "}
                          {parseFloat(m.total_refunded).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
