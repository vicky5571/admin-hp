"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import {
  fetchSalesSummary,
  fetchStockOnHand,
  fetchGrossProfit,
  fetchReturnsSummary,
} from "@/lib/api";

export default function DashboardPage() {
  const { user } = useAuth();
  const [salesData, setSalesData] = useState<any[]>([]);
  const [stockSummary, setStockSummary] = useState<any>(null);
  const [profitSummary, setProfitSummary] = useState<any>(null);
  const [returnsTotal, setReturnsTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetchSalesSummary({ period: "daily" }),
      fetchStockOnHand(),
      fetchGrossProfit(),
      fetchReturnsSummary(),
    ])
      .then(([sales, stock, profit, returns]) => {
        setSalesData(sales.data.data ?? []);
        setStockSummary(stock.data.summary);
        setProfitSummary(profit.data.summary);
        setReturnsTotal(returns.data.summary.totalReturns);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <div className="text-gray-500">Loading dashboard...</div>;
  }

  const todaySales = salesData?.[salesData.length - 1];
  const totalSales = salesData?.reduce(
    (acc, r) => acc + parseFloat(r.grand_total || 0),
    0,
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">
          Welcome back, {user?.fullName ?? "User"}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          title="Today's Sales"
          value={
            todaySales
              ? `IDR ${parseFloat(todaySales.grand_total).toLocaleString()}`
              : "IDR 0"
          }
          subtitle={`${todaySales?.transaction_count ?? 0} transactions`}
          color="blue"
        />

        <SummaryCard
          title="Total Sales (Period)"
          value={`IDR ${totalSales.toLocaleString()}`}
          subtitle={`${salesData?.length ?? 0} periods`}
          color="indigo"
        />

        <SummaryCard
          title="Stock Value"
          value={
            stockSummary
              ? `IDR ${parseFloat(stockSummary.totalStockValue).toLocaleString()}`
              : "IDR 0"
          }
          subtitle={`${stockSummary?.totalSkus ?? 0} SKUs, ${stockSummary?.lowStockCount ?? 0} low`}
          color="green"
        />

        <SummaryCard
          title="Returns Today"
          value={String(returnsTotal)}
          subtitle={
            profitSummary
              ? `Profit: IDR ${parseFloat(profitSummary.totalGrossProfit).toLocaleString()}`
              : ""
          }
          color="orange"
        />
      </div>

      {/* Recent sales table */}
      <div className="rounded-xl bg-white p-6 shadow-sm border border-gray-200">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Sales Summary by Period
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-500">
                <th className="pb-2 font-medium">Period</th>
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
              {(!salesData || salesData.length === 0) && (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-gray-400">
                    No sales data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  color,
}: {
  title: string;
  value: string;
  subtitle: string;
  color: "blue" | "indigo" | "green" | "orange";
}) {
  const colors = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
    green: "bg-green-50 border-green-200 text-green-700",
    orange: "bg-orange-50 border-orange-200 text-orange-700",
  };

  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
      <p className="mt-1 text-xs opacity-75">{subtitle}</p>
    </div>
  );
}