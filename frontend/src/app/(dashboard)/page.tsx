"use client";

import { useEffect, useRef, useState } from "react";
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
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500">
          Welcome back, {user?.fullName ?? "User"}
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
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
      <div className="rounded-xl bg-white p-4 sm:p-6 shadow-sm border border-gray-200">
        <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">
          Sales Summary by Period
        </h2>
        <div className="-mx-4 sm:-mx-6 overflow-x-auto">
          <div className="px-4 sm:px-6 inline-block min-w-full align-middle">
            <table className="w-full text-sm whitespace-nowrap">
              <thead>
                <tr className="border-b border-gray-200 text-left text-gray-500">
                  <th className="py-2 pr-6 font-medium">Period</th>
                  <th className="py-2 pr-6 font-medium">Transactions</th>
                  <th className="py-2 pr-6 font-medium">Subtotal</th>
                  <th className="py-2 pr-6 font-medium">Discount</th>
                  <th className="py-2 pr-6 font-medium">Tax</th>
                  <th className="py-2 pr-6 font-medium">Grand Total</th>
                </tr>
              </thead>
              <tbody>
                {salesData?.map((row: any, i: number) => (
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
                {(!salesData || salesData.length === 0) && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-4 text-center text-gray-400"
                    >
                      No sales data yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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

  const cardRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const el = valueRef.current;
    if (!card || !el) return;

    const fit = () => {
      el.style.fontSize = "";
      const max = card.clientWidth - 1;
      let size =
        parseFloat(getComputedStyle(el).fontSize) ||
        parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.5;
      const min = 11;
      while (el.scrollWidth > max && size > min) {
        size -= 1;
        el.style.fontSize = `${size}px`;
      }
    };

    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(card);
    return () => ro.disconnect();
  }, [value]);

  return (
    <div ref={cardRef} className={`rounded-xl border p-3 sm:p-4 lg:p-5 ${colors[color]}`}>
      <p className="text-xs sm:text-sm font-medium">{title}</p>
      <p className="mt-1 sm:mt-2 font-bold leading-tight">
        <span
          ref={valueRef}
          className="inline-block text-ellipsis overflow-hidden text-lg sm:text-xl lg:text-2xl"
        >
          {value}
        </span>
      </p>
      <p className="mt-1 text-[10px] sm:text-xs opacity-75">{subtitle}</p>
    </div>
  );
}