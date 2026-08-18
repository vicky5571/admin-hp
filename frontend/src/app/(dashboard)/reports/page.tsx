"use client";

import { useEffect, useState } from "react";
import {
  downloadReportCsv,
  fetchSalesSummary,
  fetchGrossProfit,
  fetchReturnsSummary,
} from "@/lib/api";

export default function ReportsPage() {
  const [salesData, setSalesData] = useState<any[]>([]);
  const [profitData, setProfitData] = useState<any>(null);
  const [returnsData, setReturnsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchSalesSummary({ period: "daily" }),
      fetchGrossProfit(),
      fetchReturnsSummary(),
    ])
      .then(([sales, profit, returns]) => {
        setSalesData(sales.data.data ?? []);
        setProfitData(profit.data);
        setReturnsData(returns.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-gray-500">Loading reports...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() =>
              downloadReportCsv(
                "/reports/sales-summary/csv?period=daily",
                "sales-summary.csv",
              )
            }
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium hover:bg-gray-200"
          >
            Sales Summary CSV
          </button>
          <button
            onClick={() =>
              downloadReportCsv(
                "/reports/sales-by-product/csv",
                "sales-by-product.csv",
              )
            }
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium hover:bg-gray-200"
          >
            Sales by Product CSV
          </button>
          <button
            onClick={() =>
              downloadReportCsv(
                "/reports/sales-by-cashier/csv",
                "sales-by-cashier.csv",
              )
            }
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium hover:bg-gray-200"
          >
            Sales by Cashier CSV
          </button>
          <button
            onClick={() =>
              downloadReportCsv(
                "/reports/payment-breakdown/csv",
                "payment-breakdown.csv",
              )
            }
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium hover:bg-gray-200"
          >
            Payment Breakdown CSV
          </button>
          <button
            onClick={() =>
              downloadReportCsv("/reports/gross-profit/csv", "gross-profit.csv")
            }
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium hover:bg-gray-200"
          >
            Gross Profit CSV
          </button>
          <button
            onClick={() =>
              downloadReportCsv("/reports/stock-on-hand/csv", "stock-on-hand.csv")
            }
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium hover:bg-gray-200"
          >
            Stock on Hand CSV
          </button>
          <button
            onClick={() =>
              downloadReportCsv(
                "/reports/returns-summary/csv",
                "returns-summary.csv",
              )
            }
            className="rounded-lg bg-gray-100 px-3 py-1.5 text-xs font-medium hover:bg-gray-200"
          >
            Returns Summary CSV
          </button>
        </div>
      </div>

      {/* Gross Profit Summary */}
      {profitData?.summary && (
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Gross Profit Summary
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-gray-500">Revenue</p>
              <p className="text-xl font-bold text-green-600">
                IDR{" "}
                {parseFloat(
                  profitData.summary.totalRevenue,
                ).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Cost</p>
              <p className="text-xl font-bold text-red-600">
                IDR{" "}
                {parseFloat(profitData.summary.totalCost).toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-500">Gross Profit</p>
              <p className="text-xl font-bold text-blue-600">
                IDR{" "}
                {parseFloat(
                  profitData.summary.totalGrossProfit,
                ).toLocaleString()}
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

      {/* Sales Summary */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Daily Sales
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2 font-medium">Date</th>
                <th className="pb-2 font-medium">Transactions</th>
                <th className="pb-2 font-medium">Subtotal</th>
                <th className="pb-2 font-medium">Discount</th>
                <th className="pb-2 font-medium">Tax</th>
                <th className="pb-2 font-medium">Grand Total</th>
              </tr>
            </thead>
            <tbody>
              {salesData?.map((row: any, i: number) => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-2">
                    {new Date(row.period_start).toLocaleDateString()}
                  </td>
                  <td className="py-2">{row.transaction_count}</td>
                  <td className="py-2">
                    IDR {parseFloat(row.subtotal).toLocaleString()}
                  </td>
                  <td className="py-2">
                    IDR {parseFloat(row.discount_total).toLocaleString()}
                  </td>
                  <td className="py-2">
                    IDR {parseFloat(row.tax_total).toLocaleString()}
                  </td>
                  <td className="py-2 font-medium">
                    IDR {parseFloat(row.grand_total).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Returns Summary */}
      {returnsData && (
        <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
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
                IDR{" "}
                {parseFloat(
                  returnsData.summary.totalRefunded,
                ).toLocaleString()}
              </p>
            </div>
          </div>

          <h3 className="text-sm font-medium text-gray-700 mb-2">
            By Method
          </h3>
          <div className="space-y-2">
            {returnsData.byMethod?.map((m: any, i: number) => (
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
        </div>
      )}
    </div>
  );
}