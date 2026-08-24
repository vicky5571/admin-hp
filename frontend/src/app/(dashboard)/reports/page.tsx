"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  apiFetch,
  downloadReportCsv,
  fetchSalesSummary,
  fetchGrossProfit,
  fetchReturnsSummary,
  fetchPaymentBreakdown,
  fetchSalesByCashier,
  fetchSalesByProduct,
  fetchSalesHeatmap,
  fetchAuditLogs,
  AuditLogItem,
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

function fmtIDR(n: number): string {
  return `IDR ${n.toLocaleString("id-ID")}`;
}

function fmtCompactIDR(n: number): string {
  if (n >= 1_000_000_000) return `IDR ${(n / 1_000_000_000).toFixed(1)}B`;
  if (n >= 1_000_000) return `IDR ${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `IDR ${(n / 1_000).toFixed(0)}k`;
  return `IDR ${n.toLocaleString("id-ID")}`;
}

const QUICK_RANGES = [
  { label: "Today", from: () => today(), to: () => today() },
  { label: "Yesterday", from: () => daysAgo(1), to: () => daysAgo(1) },
  { label: "Last 7 days", from: () => daysAgo(6), to: () => today() },
  { label: "Last 30 days", from: () => daysAgo(29), to: () => today() },
  { label: "This month", from: () => today().slice(0, 7) + "-01", to: () => today() },
  { label: "All time", from: () => "", to: () => "" },
];

type ChartPeriod = "daily" | "weekly" | "monthly";
const CHART_PERIODS: { label: string; short: string; value: ChartPeriod }[] = [
  { label: "Day", short: "D", value: "daily" },
  { label: "Week", short: "W", value: "weekly" },
  { label: "Month", short: "M", value: "monthly" },
];

function formatChartLabel(iso: string, period: ChartPeriod): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso.slice(0, 10);
  if (period === "monthly") return d.toLocaleDateString("en-US", { month: "short", year: "2-digit" });
  if (period === "weekly") return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatChartTooltip(iso: string, period: ChartPeriod): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  if (period === "monthly") return d.toLocaleDateString("id-ID", { month: "long", year: "numeric" });
  if (period === "weekly") {
    const end = new Date(d);
    end.setDate(end.getDate() + 6);
    return `${d.toLocaleDateString("id-ID", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("id-ID", { month: "short", day: "numeric", year: "numeric" })}`;
  }
  return d.toLocaleDateString("id-ID", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function TrendChart({
  data,
  period,
  loading,
  error,
}: {
  data: any[];
  period: ChartPeriod;
  loading: boolean;
  error: string | null;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const points = useMemo(() => {
    const rows = Array.isArray(data) ? data : [];
    return rows.map((r) => ({
      iso: String(r.period_start),
      total: parseFloat(r.grand_total ?? 0),
      tx: Number(r.transaction_count ?? 0),
    }));
  }, [data]);

  const stats = useMemo(() => {
    if (!points.length) return null;
    const totals = points.map((p) => p.total);
    const max = Math.max(...totals);
    const min = Math.min(...totals);
    const peak = points.find((p) => p.total === max) ?? points[0];
    const sum = totals.reduce((a, b) => a + b, 0);
    return { max, min, peak, sum };
  }, [points]);

  const W = 640;
  const H = 180;
  const padLeft = 8;
  const padRight = 8;
  const padTop = 12;
  const padBottom = 22;
  const chartW = W - padLeft - padRight;
  const chartH = H - padTop - padBottom;

  const maxY = useMemo(() => {
    if (!points.length) return 0;
    const m = Math.max(...points.map((p) => p.total));
    return m === 0 ? 1 : m * 1.12;
  }, [points]);

  const getX = (idx: number) => {
    if (points.length <= 1) return padLeft + chartW / 2;
    return padLeft + (idx / (points.length - 1)) * chartW;
  };
  const getY = (val: number) => {
    if (maxY === 0) return padTop + chartH;
    return padTop + chartH - (val / maxY) * chartH;
  };

  const areaPath = useMemo(() => {
    if (!points.length) return "";
    if (points.length === 1) {
      const x = getX(0);
      const y = getY(points[0].total);
      return `M ${padLeft} ${padTop + chartH} L ${x - 18} ${padTop + chartH} L ${x - 18} ${y} L ${x + 18} ${y} L ${x + 18} ${padTop + chartH} Z`;
    }
    let d = `M ${getX(0)} ${getY(points[0].total)}`;
    for (let i = 1; i < points.length; i++) d += ` L ${getX(i)} ${getY(points[i].total)}`;
    d += ` L ${getX(points.length - 1)} ${padTop + chartH} L ${getX(0)} ${padTop + chartH} Z`;
    return d;
  }, [points, maxY]);

  const linePath = useMemo(() => {
    if (!points.length) return "";
    if (points.length === 1) return "";
    let d = `M ${getX(0)} ${getY(points[0].total)}`;
    for (let i = 1; i < points.length; i++) d += ` L ${getX(i)} ${getY(points[i].total)}`;
    return d;
  }, [points, maxY]);

  const hover = hoverIdx !== null ? points[hoverIdx] : null;

  if (loading) {
    return (
      <div className="h-[220px] animate-pulse">
        <div className="h-4 w-32 rounded bg-gray-100 mb-3" />
        <div className="h-[160px] rounded-lg bg-gray-50 border border-gray-100" />
        <div className="mt-3 h-3 w-48 rounded bg-gray-100" />
      </div>
    );
  }
  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-8 text-center text-sm text-red-700">
        {error}
      </div>
    );
  }
  if (!points.length) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-12 text-center">
        <p className="text-sm text-gray-400">No sales for this period</p>
        <p className="text-xs text-gray-400 mt-1">Try a longer date range or switch to Day view</p>
      </div>
    );
  }

  const labelStep = Math.max(1, Math.ceil(points.length / 8));

  return (
    <div ref={wrapRef} className="relative">
      {hover && hoverIdx !== null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-lg border border-gray-900 bg-gray-900 px-2.5 py-1.5 shadow-lg"
          style={{
            left: `${(getX(hoverIdx) / W) * 100}%`,
            top: `${getY(hover.total) - 8}px`,
            transform: "translate(-50%, -100%)",
          }}
        >
          <div className="whitespace-nowrap text-[11px] font-semibold text-white">
            {fmtIDR(Math.round(hover.total))} · {hover.tx} tx
          </div>
          <div className="whitespace-nowrap text-[11px] text-gray-300">
            {formatChartTooltip(hover.iso, period)}
          </div>
          <div className="absolute left-1/2 top-full -translate-x-1/2 w-2 h-2 rotate-45 bg-gray-900 -mt-1" />
        </div>
      )}

      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[180px] select-none"
        role="img"
        aria-label={`Sales trend ${period}`}
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id="reportsTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0, 0.5, 1].map((t) => {
          const y = padTop + chartH * t;
          const val = maxY * (1 - t);
          return (
            <g key={t}>
              <line x1={padLeft} x2={W - padRight} y1={y} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={W - padRight} y={y - 4} textAnchor="end" fontSize={9} fill="#94a3b8">
                {fmtCompactIDR(Math.round(val))}
              </text>
            </g>
          );
        })}

        <path d={areaPath} fill="url(#reportsTrendFill)" stroke="none" />
        {linePath && <path d={linePath} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />}
        {points.length === 1 && (
          <rect
            x={getX(0) - 18}
            y={getY(points[0].total)}
            width={36}
            height={padTop + chartH - getY(points[0].total)}
            rx={6}
            fill="#2563eb"
            opacity={0.9}
          />
        )}

        {points.map((p, i) => {
          if (i % labelStep !== 0 && i !== points.length - 1) return null;
          return (
            <text
              key={p.iso + i}
              x={getX(i)}
              y={H - 4}
              textAnchor={i === 0 ? "start" : i === points.length - 1 ? "end" : "middle"}
              fontSize={9}
              fill="#64748b"
            >
              {formatChartLabel(p.iso, period)}
            </text>
          );
        })}

        {points.map((p, i) => (
          <g key={p.iso + "-dot-" + i} onMouseEnter={() => setHoverIdx(i)} className="cursor-pointer">
            <circle cx={getX(i)} cy={getY(p.total)} r={hoverIdx === i ? 5 : 3.5} fill={hoverIdx === i ? "#1d4ed8" : "#2563eb"} stroke="white" strokeWidth={2} />
            <circle cx={getX(i)} cy={getY(p.total)} r={14} fill="transparent" />
          </g>
        ))}
      </svg>

      {stats && (
        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500 border-t border-gray-100 pt-2.5">
          <span>
            Peak: <span className="font-semibold text-gray-700">{fmtIDR(Math.round(stats.max))}</span>
            <span className="text-gray-400"> · {formatChartLabel(stats.peak.iso, period)}</span>
          </span>
          <span className="hidden sm:inline text-gray-200">|</span>
          <span>
            Total: <span className="font-semibold text-gray-700">{fmtIDR(Math.round(stats.sum))}</span>
          </span>
          <span className="hidden sm:inline text-gray-200">|</span>
          <span>
            Avg / {period === "monthly" ? "month" : period === "weekly" ? "week" : "day"}:{" "}
            <span className="font-semibold text-gray-700">{fmtIDR(Math.round(stats.sum / points.length))}</span>
          </span>
        </div>
      )}
    </div>
  );
}

function formatMethodLabel(m: string): string {
  const map: Record<string, string> = { CASH: "Cash", TRANSFER: "Transfer", CARD: "Card", QRIS: "QRIS", E_WALLET: "E-Wallet", CREDIT: "Credit" };
  return map[m?.toUpperCase()] ?? m ?? "-";
}

// ── Payment Mix Card ──────────────────────────────────────────
function PaymentBreakdownCard({
  data,
  loading,
}: {
  data: any[];
  loading: boolean;
}) {
  const items = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const total = useMemo(
    () => items.reduce((acc, row) => acc + parseFloat(row.total_amount || 0), 0),
    [items]
  );

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Payment Mix</h3>
          <p className="text-xs text-gray-500 mt-0.5">Revenue breakdown by payment method</p>
        </div>
        <span className="text-sm font-bold text-gray-900">
          {loading ? "..." : fmtIDR(Math.round(total))}
        </span>
      </div>
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 rounded bg-gray-100" />
          <div className="h-4 rounded bg-gray-100" />
          <div className="h-4 rounded bg-gray-100" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">No payment data for this period</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const amount = parseFloat(item.total_amount || 0);
            const pct = total > 0 ? (amount / total) * 100 : 0;
            return (
              <div key={item.method} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium text-gray-700">
                    {formatMethodLabel(item.method)}
                    <span className="text-gray-400 font-normal ml-1.5 text-xs">
                      ({item.transaction_count} tx)
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gray-900 font-semibold">
                      {fmtCompactIDR(Math.round(amount))}
                    </span>
                    <span className="text-gray-400 font-mono text-xs w-12 text-right">
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Sales Person Leaderboard Card ─────────────────────────────
function SalesPersonLeaderboardCard({
  data,
  loading,
}: {
  data: any[];
  loading: boolean;
}) {
  const items = useMemo(() => (Array.isArray(data) ? data : []), [data]);
  const topSalesPersons = useMemo(() => items.slice(0, 8), [items]);
  const maxSales = useMemo(
    () => Math.max(...items.map((c) => parseFloat(c.total_sales || 0)), 1),
    [items]
  );

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Sales Person Leaderboard</h3>
          <p className="text-xs text-gray-500 mt-0.5">Top performing sales staff & consultants</p>
        </div>
        <span className="text-xs font-medium text-gray-500">{items.length} sales persons</span>
      </div>
      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 rounded bg-gray-100" />
          <div className="h-4 rounded bg-gray-100" />
          <div className="h-4 rounded bg-gray-100" />
        </div>
      ) : topSalesPersons.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">No sales person data for this period</p>
      ) : (
        <div className="space-y-3">
          {topSalesPersons.map((c, idx) => {
            const sales = parseFloat(c.total_sales || 0);
            const pct = (sales / maxSales) * 100;
            const personName =
              c.sales_person_name || c.full_name || c.cashier_name || "Unknown";
            return (
              <div key={c.sales_person_id ?? c.cashier_id ?? idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2 truncate max-w-[65%]">
                    <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-xs font-bold text-gray-700 shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-gray-800 truncate">
                      {personName}
                    </span>
                    <span className="text-gray-400 font-normal text-xs whitespace-nowrap">
                      · {c.transaction_count} tx
                    </span>
                  </div>
                  <span className="font-mono text-gray-900 font-semibold">
                    {fmtCompactIDR(Math.round(sales))}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 rounded-full transition-all"
                    style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Product Insight Card (Top Products by Revenue, Profit & Volume) ──
function ProductInsightCard({
  productData,
  profitData,
  loading,
}: {
  productData: any[];
  profitData: any[];
  loading: boolean;
}) {
  const [metric, setMetric] = useState<"profit" | "revenue" | "volume">("profit");

  const mergedItems = useMemo(() => {
    const pMap = new Map<string, any>();
    for (const p of Array.isArray(profitData) ? profitData : []) {
      const key = String(p.product_id ?? p.sku ?? p.product_name);
      pMap.set(key, p);
    }

    const prList = Array.isArray(productData) ? productData : [];
    return prList.map((it) => {
      const key = String(it.product_id ?? it.sku ?? it.product_name);
      const match = pMap.get(key);
      return {
        ...it,
        gross_profit: match ? parseFloat(match.gross_profit || 0) : 0,
        margin_percent: match ? parseFloat(match.margin_percent || 0) : 0,
      };
    });
  }, [productData, profitData]);

  const sorted = useMemo(() => {
    const list = [...mergedItems];
    if (metric === "volume") {
      return list.sort((a, b) => Number(b.qty_sold || 0) - Number(a.qty_sold || 0));
    }
    if (metric === "revenue") {
      return list.sort((a, b) => parseFloat(b.net_sales || 0) - parseFloat(a.net_sales || 0));
    }
    return list.sort((a, b) => parseFloat(b.gross_profit || 0) - parseFloat(a.gross_profit || 0));
  }, [mergedItems, metric]);

  const topItems = useMemo(() => sorted.slice(0, 5), [sorted]);

  const maxVal = useMemo(() => {
    if (metric === "volume") {
      return Math.max(...topItems.map((it) => Number(it.qty_sold || 0)), 1);
    }
    if (metric === "revenue") {
      return Math.max(...topItems.map((it) => parseFloat(it.net_sales || 0)), 1);
    }
    return Math.max(...topItems.map((it) => Math.max(0, parseFloat(it.gross_profit || 0))), 1);
  }, [topItems, metric]);

  const totals = useMemo(() => {
    const totalUnits = mergedItems.reduce((acc, it) => acc + Number(it.qty_sold || 0), 0);
    const totalNet = mergedItems.reduce((acc, it) => acc + parseFloat(it.net_sales || 0), 0);
    const totalProfit = mergedItems.reduce((acc, it) => acc + parseFloat(it.gross_profit || 0), 0);
    return { totalUnits, totalNet, totalProfit };
  }, [mergedItems]);

  const barColor = metric === "profit" ? "bg-emerald-600" : metric === "volume" ? "bg-amber-600" : "bg-blue-600";
  const badgeColor = metric === "profit" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : metric === "volume" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200";

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">Product Insights</h3>
          <p className="text-xs text-gray-500 mt-0.5">
            {mergedItems.length} products sold · {totals.totalUnits} units · {fmtIDR(Math.round(totals.totalProfit))} profit · {fmtIDR(Math.round(totals.totalNet))} rev
          </p>
        </div>
        <div className="inline-flex rounded-full border border-gray-200 p-0.5 bg-gray-50 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetric("profit")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              metric === "profit"
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Top Profit
          </button>
          <button
            type="button"
            onClick={() => setMetric("revenue")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              metric === "revenue"
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Top Revenue
          </button>
          <button
            type="button"
            onClick={() => setMetric("volume")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              metric === "volume"
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Top Volume
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          <div className="h-4 rounded bg-gray-100" />
          <div className="h-4 rounded bg-gray-100" />
          <div className="h-4 rounded bg-gray-100" />
        </div>
      ) : topItems.length === 0 ? (
        <p className="text-xs text-gray-400 py-4 text-center">No product sales data for this period</p>
      ) : (
        <div className="space-y-3.5">
          {topItems.map((it, idx) => {
            const net = parseFloat(it.net_sales || 0);
            const profit = parseFloat(it.gross_profit || 0);
            const qty = Number(it.qty_sold || 0);
            const val = metric === "volume" ? qty : metric === "profit" ? Math.max(0, profit) : net;
            const pct = (val / maxVal) * 100;
            return (
              <div key={it.product_id ?? idx} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <div className="flex items-center gap-2 truncate max-w-[60%]">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-xs font-bold border shrink-0 ${badgeColor}`}>
                      {idx + 1}
                    </span>
                    <div className="truncate">
                      <span className="font-medium text-gray-800">{it.product_name || "Unknown"}</span>
                      {it.brand_name && (
                        <span className="ml-1.5 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500 font-medium">
                          {it.brand_name}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-mono text-right">
                    {metric === "profit" && (
                      <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                        {it.margin_percent ? `${it.margin_percent.toFixed(1)}% margin` : "0.0%"}
                      </span>
                    )}
                    {metric !== "profit" && (
                      <span className="text-xs text-gray-500 font-normal">
                        {qty} pcs
                      </span>
                    )}
                    <span className="font-semibold text-gray-900">
                      {fmtCompactIDR(Math.round(metric === "profit" ? profit : net))}
                    </span>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${barColor}`}
                    style={{ width: `${Math.min(100, Math.max(2, pct))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Void & Return Analytics Card ──────────────────────────────
function VoidAndReturnsCard({
  returnsData,
  voidStats,
  auditLogs,
  loading,
}: {
  returnsData: any;
  voidStats: {
    voidCount: number;
    voidRate: number;
    totalVoidedAmount: number;
    completedCount: number;
  };
  auditLogs: AuditLogItem[];
  loading: boolean;
}) {
  const totalReturns = Number(returnsData?.summary?.totalReturns || 0);
  const totalRefunded = parseFloat(returnsData?.summary?.totalRefunded || 0);
  const returnRate = voidStats.completedCount > 0 ? (totalReturns / voidStats.completedCount) * 100 : 0;

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4 sm:p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Void & Return Analytics
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit lost revenue, refund methods, and cashier void frequency
          </p>
        </div>
      </div>

      {/* 4-KPI Metric Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl bg-rose-50 border border-rose-200 p-3.5 sm:p-4">
          <p className="text-xs font-semibold text-rose-700">Total Voids</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-rose-900">
            {loading ? "..." : voidStats.voidCount} <span className="text-xs font-normal text-rose-600">tx</span>
          </p>
          <p className="mt-1 text-xs text-rose-700 font-mono font-medium">
            {loading ? "..." : fmtIDR(Math.round(voidStats.totalVoidedAmount))}
          </p>
        </div>

        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 sm:p-4">
          <p className="text-xs font-semibold text-amber-700">Void Rate</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-amber-900">
            {loading ? "..." : `${voidStats.voidRate.toFixed(1)}%`}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            of all transactions
          </p>
        </div>

        <div className="rounded-xl bg-orange-50 border border-orange-200 p-3.5 sm:p-4">
          <p className="text-xs font-semibold text-orange-700">Total Returns</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-orange-900">
            {loading ? "..." : totalReturns} <span className="text-xs font-normal text-orange-600">returns</span>
          </p>
          <p className="mt-1 text-xs text-orange-700 font-mono font-medium">
            {loading ? "..." : fmtIDR(Math.round(totalRefunded))}
          </p>
        </div>

        <div className="rounded-xl bg-purple-50 border border-purple-200 p-3.5 sm:p-4">
          <p className="text-xs font-semibold text-purple-700">Return Rate</p>
          <p className="mt-1 text-xl sm:text-2xl font-bold text-purple-900">
            {loading ? "..." : `${returnRate.toFixed(1)}%`}
          </p>
          <p className="mt-1 text-xs text-purple-700">
            vs completed sales
          </p>
        </div>
      </div>

      {/* 2-Column Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
        {/* Left: Returns by Refund Method */}
        <div className="space-y-3">
          <h4 className="text-sm font-semibold text-gray-800">Returns by Refund Method</h4>
          {loading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-9 rounded bg-gray-100" />
              <div className="h-9 rounded bg-gray-100" />
            </div>
          ) : !returnsData?.byMethod || returnsData.byMethod.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
              No returns recorded for this period
            </p>
          ) : (
            <div className="space-y-2">
              {returnsData.byMethod.map((m: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-100 px-3 py-2 text-xs"
                >
                  <span className="font-medium text-gray-700">{formatMethodLabel(m.refund_method)}</span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className="text-gray-500">{m.return_count} tx</span>
                    <span className="font-semibold text-gray-900">
                      {fmtIDR(Math.round(parseFloat(m.total_refunded || 0)))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Void Audit Trail */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-gray-800">Void Audit Trail</h4>
            <span className="text-xs text-gray-400 font-mono">{auditLogs.length} recent logs</span>
          </div>

          {loading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-9 rounded bg-gray-100" />
              <div className="h-9 rounded bg-gray-100" />
            </div>
          ) : auditLogs.length === 0 ? (
            <p className="text-xs text-gray-400 py-6 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
              No void audit logs recorded for this period
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {auditLogs.map((log) => {
                const inv = log.metadataJson?.invoiceNumber;
                const total = log.metadataJson?.grandTotal;
                return (
                  <div
                    key={log.id}
                    className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/40 px-3 py-2 text-xs hover:bg-rose-50 transition-colors"
                  >
                    <div className="truncate max-w-[65%]">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-semibold text-rose-700">
                          {inv || `Sale #${log.entityId || log.id}`}
                        </span>
                        <span className="text-gray-400 text-[10px]">·</span>
                        <span className="text-gray-700 truncate font-medium">
                          {log.user?.fullName || log.user?.username || `User #${log.userId}`}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        {new Date(log.eventTime).toLocaleString("id-ID", {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                        {log.ipAddress && ` · ${log.ipAddress}`}
                      </div>
                    </div>
                    {total && (
                      <span className="font-mono text-xs font-semibold text-rose-800 shrink-0">
                        {fmtIDR(Math.round(parseFloat(String(total))))}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sales Velocity Heatmap Card (Day-of-Week x Hour-of-Day) ──
const DAYS_OF_WEEK = [
  { index: 1, label: "Mon", full: "Monday" },
  { index: 2, label: "Tue", full: "Tuesday" },
  { index: 3, label: "Wed", full: "Wednesday" },
  { index: 4, label: "Thu", full: "Thursday" },
  { index: 5, label: "Fri", full: "Friday" },
  { index: 6, label: "Sat", full: "Saturday" },
  { index: 0, label: "Sun", full: "Sunday" },
];

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7:00 AM to 22:00 PM (7..22)

function formatHourLabel(h: number): string {
  const ampm = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}${ampm}`;
}

function SalesVelocityHeatmapCard({
  data,
  loading,
}: {
  data: any[];
  loading: boolean;
}) {
  const [metric, setMetric] = useState<"profit" | "revenue" | "tx">("profit");
  const [hoverCell, setHoverCell] = useState<{
    day: (typeof DAYS_OF_WEEK)[number];
    hour: number;
    tx: number;
    rev: number;
    profit: number;
  } | null>(null);

  const rows = useMemo(() => (Array.isArray(data) ? data : []), [data]);

  const matrix = useMemo(() => {
    const map = new Map<string, { tx: number; rev: number; profit: number }>();
    for (const r of rows) {
      const dow = Number(r.day_of_week);
      const hr = Number(r.hour_of_day);
      map.set(`${dow}-${hr}`, {
        tx: Number(r.transaction_count || 0),
        rev: parseFloat(r.total_sales || 0),
        profit: parseFloat(r.gross_profit || 0),
      });
    }
    return map;
  }, [rows]);

  const getMetricVal = (item: { tx: number; rev: number; profit: number }) => {
    if (metric === "profit") return item.profit;
    if (metric === "revenue") return item.rev;
    return item.tx;
  };

  const maxVal = useMemo(() => {
    let max = 0;
    for (const item of matrix.values()) {
      const val = getMetricVal(item);
      if (val > max) max = val;
    }
    return max || 1;
  }, [matrix, metric]);

  const peak = useMemo(() => {
    let best = { dow: 1, hour: 12, tx: 0, rev: 0, profit: 0 };
    for (const [key, val] of matrix.entries()) {
      const [d, h] = key.split("-").map(Number);
      const score = getMetricVal(val);
      const bestScore = getMetricVal(best);
      if (score > bestScore) {
        best = { dow: d, hour: h, tx: val.tx, rev: val.rev, profit: val.profit };
      }
    }
    const dayObj = DAYS_OF_WEEK.find((d) => d.index === best.dow) ?? DAYS_OF_WEEK[0];
    return { ...best, dayObj };
  }, [matrix, metric]);

  const getCellColor = (val: number) => {
    if (!val || val <= 0) return "bg-gray-50 text-gray-400 border-gray-100";
    const ratio = Math.max(0, val) / maxVal;
    if (metric === "profit") {
      if (ratio < 0.25) return "bg-emerald-100/80 text-emerald-900 border-emerald-200";
      if (ratio < 0.5) return "bg-emerald-300 text-emerald-950 border-emerald-400 font-medium";
      if (ratio < 0.75) return "bg-emerald-500 text-white border-emerald-600 font-semibold";
      return "bg-emerald-700 text-white border-emerald-800 font-bold";
    }
    if (metric === "revenue") {
      if (ratio < 0.25) return "bg-blue-100/80 text-blue-900 border-blue-200";
      if (ratio < 0.5) return "bg-blue-300 text-blue-950 border-blue-400 font-medium";
      if (ratio < 0.75) return "bg-blue-500 text-white border-blue-600 font-semibold";
      return "bg-blue-700 text-white border-blue-800 font-bold";
    }
    if (ratio < 0.25) return "bg-slate-100 text-slate-800 border-slate-200";
    if (ratio < 0.5) return "bg-slate-300 text-slate-900 border-slate-400 font-medium";
    if (ratio < 0.75) return "bg-slate-600 text-white border-slate-700 font-semibold";
    return "bg-slate-900 text-white border-slate-950 font-bold";
  };

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4 sm:p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-gray-100 pb-4">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            Sales Velocity Heatmap
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">
            Store traffic & profit by day-of-week and hour-of-day
            {peak.tx > 0 && (
              <span className={`ml-1 font-medium ${metric === "profit" ? "text-emerald-700" : "text-blue-700"}`}>
                · Peak: {peak.dayObj.full} {formatHourLabel(peak.hour)} (
                {metric === "profit"
                  ? `${fmtCompactIDR(Math.round(peak.profit))} profit`
                  : metric === "revenue"
                    ? `${fmtCompactIDR(Math.round(peak.rev))} rev`
                    : `${peak.tx} tx`}
                )
              </span>
            )}
          </p>
        </div>
        <div className="inline-flex rounded-full border border-gray-200 p-0.5 bg-gray-50 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setMetric("profit")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              metric === "profit"
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Profit
          </button>
          <button
            type="button"
            onClick={() => setMetric("revenue")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              metric === "revenue"
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Revenue
          </button>
          <button
            type="button"
            onClick={() => setMetric("tx")}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              metric === "tx"
                ? "bg-gray-900 text-white shadow-sm"
                : "text-gray-600 hover:text-gray-900"
            }`}
          >
            Transactions
          </button>
        </div>
      </div>

      {loading ? (
        <div className="h-44 animate-pulse rounded-lg bg-gray-50 border border-gray-100" />
      ) : rows.length === 0 ? (
        <p className="text-xs text-gray-400 py-8 text-center bg-gray-50 rounded-lg border border-dashed border-gray-200">
          No hourly transaction data for this period
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="min-w-[560px]">
            {/* Header row: Hours */}
            <div className="grid grid-cols-[48px_repeat(16,1fr)] gap-1 text-[10px] text-gray-500 font-medium mb-1.5 text-center">
              <span className="text-left font-normal text-gray-400">Day</span>
              {HOURS.map((h) => (
                <span key={h} className="truncate">
                  {h % 2 === 0 ? formatHourLabel(h) : ""}
                </span>
              ))}
            </div>

            {/* Matrix rows: Days of week */}
            <div className="space-y-1">
              {DAYS_OF_WEEK.map((day) => (
                <div
                  key={day.index}
                  className="grid grid-cols-[48px_repeat(16,1fr)] gap-1 items-center"
                >
                  <span className="text-xs font-semibold text-gray-600 select-none">
                    {day.label}
                  </span>
                  {HOURS.map((h) => {
                    const cell = matrix.get(`${day.index}-${h}`) ?? { tx: 0, rev: 0, profit: 0 };
                    const val = getMetricVal(cell);
                    const isPeak = peak.dow === day.index && peak.hour === h && val > 0;
                    const ringColor = metric === "profit" ? "ring-emerald-500" : "ring-blue-500";

                    return (
                      <div
                        key={h}
                        onMouseEnter={() =>
                          setHoverCell({
                            day,
                            hour: h,
                            tx: cell.tx,
                            rev: cell.rev,
                            profit: cell.profit,
                          })
                        }
                        onMouseLeave={() => setHoverCell(null)}
                        className={`relative h-6 sm:h-7 rounded border text-[10px] flex items-center justify-center cursor-pointer transition-transform hover:scale-105 hover:z-10 ${getCellColor(val)} ${isPeak ? `ring-2 ${ringColor} ring-offset-1` : ""}`}
                        title={`${day.full} ${h}:00 - ${h + 1}:00: ${fmtIDR(Math.round(cell.profit))} profit, ${fmtIDR(Math.round(cell.rev))} rev, ${cell.tx} tx`}
                      >
                        {val > 0 ? (
                          <span className="truncate scale-90 sm:scale-100">
                            {metric === "tx"
                              ? cell.tx
                              : metric === "profit"
                                ? fmtCompactIDR(Math.round(cell.profit)).replace("IDR ", "")
                                : fmtCompactIDR(Math.round(cell.rev)).replace("IDR ", "")}
                          </span>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              ))}
            </div>

            {/* Hover tooltip / legend bar */}
            <div className="mt-3 flex flex-wrap items-center justify-between text-xs text-gray-500 border-t border-gray-100 pt-2.5">
              <div className="h-5">
                {hoverCell ? (
                  <span className="font-medium text-gray-800">
                    {hoverCell.day.full} {hoverCell.hour}:00–{hoverCell.hour + 1}:00 ·{" "}
                    <span className="text-emerald-700 font-semibold">{fmtIDR(Math.round(hoverCell.profit))} profit</span> ·{" "}
                    <span className="text-blue-700 font-semibold">{fmtIDR(Math.round(hoverCell.rev))} rev</span> ·{" "}
                    <span className="text-gray-600 font-semibold">{hoverCell.tx} tx</span>
                  </span>
                ) : (
                  <span className="text-gray-400">Hover over any cell to see exact profit, revenue & traffic</span>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-gray-400">
                <span>Low</span>
                <span className="inline-block w-3 h-3 rounded bg-gray-100 border border-gray-200" />
                {metric === "profit" ? (
                  <>
                    <span className="inline-block w-3 h-3 rounded bg-emerald-100 border border-emerald-200" />
                    <span className="inline-block w-3 h-3 rounded bg-emerald-300 border border-emerald-400" />
                    <span className="inline-block w-3 h-3 rounded bg-emerald-500 border border-emerald-600" />
                    <span className="inline-block w-3 h-3 rounded bg-emerald-700 border border-emerald-800" />
                  </>
                ) : (
                  <>
                    <span className="inline-block w-3 h-3 rounded bg-blue-100 border border-blue-200" />
                    <span className="inline-block w-3 h-3 rounded bg-blue-300 border border-blue-400" />
                    <span className="inline-block w-3 h-3 rounded bg-blue-500 border border-blue-600" />
                    <span className="inline-block w-3 h-3 rounded bg-blue-700 border border-blue-800" />
                  </>
                )}
                <span>Peak</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState(daysAgo(29));
  const [dateTo, setDateTo] = useState(today());
  const [activeQuick, setActiveQuick] = useState("Last 30 days");

  const [salesData, setSalesData] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any[]>([]);
  const [cashierData, setCashierData] = useState<any[]>([]);
  const [productData, setProductData] = useState<any[]>([]);
  const [heatmapData, setHeatmapData] = useState<any[]>([]);
  const [voidStats, setVoidStats] = useState({
    voidCount: 0,
    voidRate: 0,
    totalVoidedAmount: 0,
    completedCount: 0,
  });
  const [voidAuditLogs, setVoidAuditLogs] = useState<AuditLogItem[]>([]);
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("daily");
  const [trendLoading, setTrendLoading] = useState(false);
  const [profitData, setProfitData] = useState<any>(null);
  const [returnsData, setReturnsData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);

  const load = useCallback(
    async (from: string, to: string, period: ChartPeriod = "daily") => {
      setLoading(true);
      setError(null);
      try {
        const params = {
          dateFrom: from || undefined,
          dateTo: to || undefined,
        };
        const [
          sales,
          profit,
          returns,
          payments,
          cashiers,
          products,
          heatmap,
          voidedSalesRes,
          auditLogsRes,
        ] = await Promise.all([
          fetchSalesSummary({ period, ...params }),
          fetchGrossProfit(params),
          fetchReturnsSummary(params),
          fetchPaymentBreakdown(params),
          fetchSalesByCashier(params),
          fetchSalesByProduct(params),
          fetchSalesHeatmap(params).catch(() => ({ data: [] as any[] })),
          apiFetch<any[]>(
            `/sales?status=VOIDED${params.dateFrom ? `&dateFrom=${params.dateFrom}` : ""}${params.dateTo ? `&dateTo=${params.dateTo}` : ""}&limit=100`
          ).catch(() => ({ data: [], meta: { total: 0 } })),
          fetchAuditLogs({
            entityType: "SALE",
            action: "SALE_VOIDED",
            dateFrom: params.dateFrom,
            dateTo: params.dateTo,
            limit: 30,
          }).catch(() => ({ data: [] as AuditLogItem[], total: 0 })),
        ]);
        const sRows = (sales as any)?.data?.data ?? (sales as any)?.data ?? [];
        const safeRows = Array.isArray(sRows) ? sRows : [];
        const pRows = (payments as any)?.data?.data ?? (payments as any)?.data ?? [];
        const cRows = (cashiers as any)?.data?.data ?? (cashiers as any)?.data ?? [];
        const prRows = (products as any)?.data?.data ?? (products as any)?.data ?? [];
        const hRows = (heatmap as any)?.data?.data ?? (heatmap as any)?.data ?? [];

        const voidRows = Array.isArray(voidedSalesRes.data) ? voidedSalesRes.data : [];
        const voidCount = Number((voidedSalesRes as any)?.meta?.total ?? voidRows.length);
        const totalVoidedAmount = voidRows.reduce(
          (acc: number, s: any) => acc + parseFloat(s.grandTotal || s.grand_total || 0),
          0
        );
        const completedCount = safeRows.reduce(
          (acc: number, r: any) => acc + Number(r.transaction_count || 0),
          0
        );
        const totalAll = completedCount + voidCount;
        const voidRate = totalAll > 0 ? (voidCount / totalAll) * 100 : 0;

        setSalesData(safeRows);
        setTrendData(safeRows);
        setPaymentData(Array.isArray(pRows) ? pRows : []);
        setCashierData(Array.isArray(cRows) ? cRows : []);
        setProductData(Array.isArray(prRows) ? prRows : []);
        setHeatmapData(Array.isArray(hRows) ? hRows : []);
        setProfitData(profit.data);
        setReturnsData(returns.data);
        setVoidStats({
          voidCount,
          voidRate,
          totalVoidedAmount,
          completedCount,
        });
        setVoidAuditLogs(Array.isArray(auditLogsRes.data) ? auditLogsRes.data : []);
      } catch (err: any) {
        setError(err?.message || "Failed to load report data. Please try again.");
      } finally {
        setLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    load(dateFrom, dateTo, chartPeriod);
  }, [load, dateFrom, dateTo]);

  const handlePeriodChange = async (p: ChartPeriod) => {
    setChartPeriod(p);
    setTrendLoading(true);
    try {
      const res = await fetchSalesSummary({
        period: p,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      const rows = (res as any)?.data?.data ?? (res as any)?.data ?? [];
      setTrendData(Array.isArray(rows) ? rows : []);
    } catch {
      // keep previous trend data visible
    } finally {
      setTrendLoading(false);
    }
  };

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
          {/* Sales Trend Chart */}
          <div className="rounded-xl bg-white p-4 sm:p-6 shadow-sm border border-gray-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                  Sales Trend
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">
                  Revenue and transaction velocity over time · {rangeLabel}
                </p>
              </div>
              <div className="inline-flex rounded-full border border-gray-200 p-0.5 bg-gray-50 self-start sm:self-auto">
                {CHART_PERIODS.map((p) => (
                  <button
                    key={p.value}
                    onClick={() => handlePeriodChange(p.value)}
                    className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                      chartPeriod === p.value
                        ? "bg-gray-900 text-white shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                    aria-pressed={chartPeriod === p.value}
                  >
                    <span className="sm:hidden">{p.short}</span>
                    <span className="hidden sm:inline">{p.label}</span>
                  </button>
                ))}
              </div>
            </div>

            <TrendChart
              data={trendData}
              period={chartPeriod}
              loading={trendLoading}
              error={null}
            />
          </div>

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

          {/* Product Insights */}
          <ProductInsightCard productData={productData} profitData={profitData?.data ?? []} loading={loading} />

          {/* Payment Breakdown & Sales Person Leaderboard */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PaymentBreakdownCard data={paymentData} loading={loading} />
            <SalesPersonLeaderboardCard data={cashierData} loading={loading} />
          </div>

          {/* Sales Velocity Heatmap */}
          <SalesVelocityHeatmapCard data={heatmapData} loading={loading} />

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

          {/* Void & Return Analytics */}
          <VoidAndReturnsCard
            returnsData={returnsData}
            voidStats={voidStats}
            auditLogs={voidAuditLogs}
            loading={loading}
          />
        </>
      )}
    </div>
  );
}
