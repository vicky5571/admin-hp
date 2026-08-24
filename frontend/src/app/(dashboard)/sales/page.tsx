"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  apiFetch,
  downloadReceiptPdf,
  fetchSaleReceipt,
  fetchSalesSummary,
  fetchUsers,
  ReceiptPayload,
  AppUser,
} from "@/lib/api";
import PrintReceiptModal from "@/components/PrintReceiptModal";

// ── date helpers ────────────────────────────────────────────────
function today(): string {
  const d = new Date();
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
function addDays(iso: string, delta: number): string {
  const d = new Date(iso + "T12:00:00");
  d.setDate(d.getDate() + delta);
  return [
    d.getFullYear(),
    String(d.getMonth() + 1).padStart(2, "0"),
    String(d.getDate()).padStart(2, "0"),
  ].join("-");
}
function getPreviousRange(
  from: string,
  to: string
): { dateFrom: string; dateTo: string } | null {
  if (!from || !to) return null;
  const start = new Date(from + "T12:00:00");
  const end = new Date(to + "T12:00:00");
  if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
  const days = Math.round((end.getTime() - start.getTime()) / 86400000) + 1;
  if (days <= 0) return null;
  return {
    dateFrom: addDays(from, -days),
    dateTo: addDays(from, -1),
  };
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
function calcDelta(
  cur: number,
  prev: number | null
): { pct: number | null; dir: "up" | "down" | "flat" } {
  if (prev === null || prev === 0) {
    if (cur === 0 || prev === null) return { pct: null, dir: "flat" };
    return { pct: 100, dir: "up" };
  }
  const pct = ((cur - prev) / Math.abs(prev)) * 100;
  const dir = pct > 0.05 ? "up" : pct < -0.05 ? "down" : "flat";
  return { pct, dir };
}

const QUICK_RANGES = [
  { label: "Today", from: () => today(), to: () => today() },
  { label: "Yesterday", from: () => daysAgo(1), to: () => daysAgo(1) },
  { label: "Last 7 days", from: () => daysAgo(6), to: () => today() },
  { label: "Last 30 days", from: () => daysAgo(29), to: () => today() },
  { label: "This month", from: () => today().slice(0, 7) + "-01", to: () => today() },
  { label: "All time", from: () => "", to: () => "" },
] as const;

const SALE_STATUSES = [
  { label: "All", value: "" },
  { label: "Completed", value: "COMPLETED" },
  { label: "Partially Refunded", value: "PARTIALLY_REFUNDED" },
  { label: "Voided", value: "VOIDED" },
] as const;

type ChartPeriod = "daily" | "weekly" | "monthly";
const CHART_PERIODS: { label: string; short: string; value: ChartPeriod }[] = [
  { label: "Day", short: "D", value: "daily" },
  { label: "Week", short: "W", value: "weekly" },
  { label: "Month", short: "M", value: "monthly" },
];

// ── KPI aggregation ───────────────────────────────────────────
type SummaryAgg = {
  grandTotal: number;
  txCount: number;
  subtotal: number;
  discountTotal: number;
  avgBasket: number;
  discountRate: number;
};
function summarize(rows: any[]): SummaryAgg {
  let grandTotal = 0;
  let txCount = 0;
  let subtotal = 0;
  let discountTotal = 0;
  for (const r of rows) {
    grandTotal += parseFloat(r.grand_total ?? 0);
    txCount += Number(r.transaction_count ?? 0);
    subtotal += parseFloat(r.subtotal ?? 0);
    discountTotal += parseFloat(r.discount_total ?? 0);
  }
  const avgBasket = txCount ? grandTotal / txCount : 0;
  const discountRate = subtotal ? (discountTotal / subtotal) * 100 : 0;
  return { grandTotal, txCount, subtotal, discountTotal, avgBasket, discountRate };
}

// ── Delta badge ───────────────────────────────────────────────
function DeltaBadge({
  pct,
  dir,
  invert,
}: {
  pct: number | null;
  dir: "up" | "down" | "flat";
  invert?: boolean;
}) {
  if (pct === null) {
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-gray-400">
        vs prev —
      </span>
    );
  }
  const isInvert = invert;
  const isGood = isInvert ? dir === "down" : dir === "up";
  const isBad = isInvert ? dir === "up" : dir === "down";
  const color = dir === "flat" ? "bg-gray-100 text-gray-500" : isGood ? "bg-emerald-100 text-emerald-700" : isBad ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-500";
  const arrow = dir === "up" ? "▲" : dir === "down" ? "▼" : "—";
  return (
    <span className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${color}`}>
      <span aria-hidden>{arrow}</span>
      {pct > 0 ? "+" : ""}
      {pct.toFixed(1)}%
    </span>
  );
}

// ── KPI card (copy of dashboard SummaryCard + delta) ─────────
function KpiCard({
  title,
  value,
  subtitle,
  delta,
  deltaInvert,
  color,
  loading,
}: {
  title: string;
  value: string;
  subtitle: string;
  delta: { pct: number | null; dir: "up" | "down" | "flat" };
  deltaInvert?: boolean;
  color: "blue" | "indigo" | "green" | "amber";
  loading?: boolean;
}) {
  const colors: Record<string, string> = {
    blue: "bg-blue-50 border-blue-200 text-blue-700",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-700",
    green: "bg-green-50 border-green-200 text-green-700",
    amber: "bg-amber-50 border-amber-200 text-amber-700",
  };
  const cardRef = useRef<HTMLDivElement>(null);
  const valueRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    const el = valueRef.current;
    if (!card || !el) return;
    const fit = () => {
      el.style.fontSize = "";
      const max = card.clientWidth - 8;
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

  if (loading) {
    return (
      <div className={`rounded-xl border p-3 sm:p-4 lg:p-5 animate-pulse ${colors[color]}`}>
        <div className="h-3 w-20 rounded bg-black/10" />
        <div className="mt-3 h-6 w-32 rounded bg-black/10" />
        <div className="mt-2 h-3 w-24 rounded bg-black/10" />
      </div>
    );
  }

  return (
    <div ref={cardRef} className={`rounded-xl border p-3 sm:p-4 lg:p-5 ${colors[color]}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs sm:text-sm font-medium leading-tight">{title}</p>
        <DeltaBadge pct={delta.pct} dir={delta.dir} invert={deltaInvert} />
      </div>
      <p className="mt-1 sm:mt-2 font-bold leading-tight">
        <span ref={valueRef} className="inline-block overflow-hidden text-ellipsis text-lg sm:text-xl lg:text-2xl">
          {value}
        </span>
      </p>
      <p className="mt-1 text-[10px] sm:text-xs opacity-75">{subtitle}</p>
    </div>
  );
}

// ── Mini trend chart — Area of grand_total over period_start ──
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
    return data.map((r) => ({
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

  // SVG geometry
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
    // add 12% headroom so line doesn't clip top
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
      // single bar-like area
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

  // x labels: show up to 8 evenly spaced
  const labelStep = Math.max(1, Math.ceil(points.length / 8));

  return (
    <div ref={wrapRef} className="relative">
      {/* hover tooltip */}
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
          <linearGradient id="salesTrendFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#2563eb" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* grid lines */}
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

        {/* area */}
        <path d={areaPath} fill="url(#salesTrendFill)" stroke="none" />
        {/* line */}
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

        {/* x labels */}
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

        {/* dots + hit targets */}
        {points.map((p, i) => (
          <g key={p.iso + "-dot-" + i} onMouseEnter={() => setHoverIdx(i)} className="cursor-pointer">
            <circle cx={getX(i)} cy={getY(p.total)} r={hoverIdx === i ? 5 : 3.5} fill={hoverIdx === i ? "#1d4ed8" : "#2563eb"} stroke="white" strokeWidth={2} />
            {/* larger invisible hit area */}
            <circle cx={getX(i)} cy={getY(p.total)} r={14} fill="transparent" />
          </g>
        ))}
      </svg>

      {/* stats footer */}
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

export default function SalesPage() {
  // ── filters / KPI state ─────────────────────────────────────
  const [dateFrom, setDateFrom] = useState(daysAgo(29));
  const [dateTo, setDateTo] = useState(today());
  const [activeQuick, setActiveQuick] = useState("Last 30 days");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [invoiceInput, setInvoiceInput] = useState("");
  const [invoiceQuery, setInvoiceQuery] = useState("");
  const [cashierId, setCashierId] = useState<string>("");
  const [cashiers, setCashiers] = useState<AppUser[]>([]);
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [kpi, setKpi] = useState<{
    cur: SummaryAgg;
    prev: SummaryAgg | null;
    deltas: Record<string, { pct: number | null; dir: "up" | "down" | "flat" }>;
  } | null>(null);

  // ── chart state — Area/Bar of grand_total over period_start ─
  const [chartPeriod, setChartPeriod] = useState<ChartPeriod>("daily");
  const [chartData, setChartData] = useState<any[]>([]);
  const [chartLoading, setChartLoading] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);

  // ── table state ─────────────────────────────────────────────
  const [sales, setSales] = useState<any[]>([]);
  const [meta, setMeta] = useState<{ page: number; pageCount: number; total?: number }>({
    page: 1,
    pageCount: 1,
  });
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptPayload | null>(null);
  const [fetchingReceiptId, setFetchingReceiptId] = useState<number | null>(null);

  // ── richer rows — expandable drawer (items + imeis + change) ──
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set());
  const [receiptCache, setReceiptCache] = useState<Record<number, ReceiptPayload>>({});
  const [drawerLoadingId, setDrawerLoadingId] = useState<number | null>(null);
  const [drawerErrors, setDrawerErrors] = useState<Record<number, string>>({});

  // ── cashiers for dropdown ───────────────────────────────────
  useEffect(() => {
    fetchUsers()
      .then((res) => setCashiers(res.data ?? []))
      .catch(() => {});
  }, []);

  // ── debounce invoice search (400ms) ─────────────────────────
  useEffect(() => {
    const t = setTimeout(() => setInvoiceQuery(invoiceInput.trim()), 400);
    return () => clearTimeout(t);
  }, [invoiceInput]);

  // ── KPI fetch (re-uses fetchSalesSummary) ────────────────────
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setKpiLoading(true);
      setKpiError(null);
      const prevRange = getPreviousRange(dateFrom, dateTo);
      try {
        const curPromise = fetchSalesSummary({
          period: "daily",
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        });
        const prevPromise = prevRange
          ? fetchSalesSummary({
              period: "daily",
              dateFrom: prevRange.dateFrom,
              dateTo: prevRange.dateTo,
            })
          : Promise.resolve(null);

        const [curRes, prevRes] = await Promise.all([curPromise, prevPromise]);
        if (cancelled) return;
        const curRows: any[] = (curRes as any)?.data?.data ?? [];
        const prevRows: any[] = (prevRes as any)?.data?.data ?? [];
        const cur = summarize(curRows);
        const prev = prevRange ? summarize(prevRows) : null;
        const deltas = {
          grandTotal: calcDelta(cur.grandTotal, prev ? prev.grandTotal : null),
          txCount: calcDelta(cur.txCount, prev ? prev.txCount : null),
          avgBasket: calcDelta(cur.avgBasket, prev ? prev.avgBasket : null),
          discountRate: calcDelta(cur.discountRate, prev ? prev.discountRate : null),
        };
        setKpi({ cur, prev, deltas });
      } catch (e: any) {
        if (!cancelled) setKpiError(e?.message || "Failed to load KPIs");
      } finally {
        if (!cancelled) setKpiLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo]);

  // ── Chart fetch — grand_total over period_start, toggle day/week/month (backend dateTrunc :19) ──
  useEffect(() => {
    let cancelled = false;
    async function run() {
      setChartLoading(true);
      setChartError(null);
      try {
        const res = await fetchSalesSummary({
          period: chartPeriod,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        });
        if (cancelled) return;
        const rows: any[] = (res as any)?.data?.data ?? [];
        setChartData(rows);
      } catch (e: any) {
        if (!cancelled) setChartError(e?.message || "Failed to load trend");
      } finally {
        if (!cancelled) setChartLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [dateFrom, dateTo, chartPeriod]);

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const q = new URLSearchParams();
        q.set("page", String(page));
        q.set("limit", "20");
        if (dateFrom) q.set("dateFrom", dateFrom);
        if (dateTo) q.set("dateTo", dateTo);
        if (statusFilter) q.set("status", statusFilter);
        if (invoiceQuery) q.set("invoiceNumber", invoiceQuery);
        if (cashierId) q.set("cashierId", cashierId);
        const res = await apiFetch<any>(`/sales?${q.toString()}`);
        setSales(res.data ?? []);
        const m = (res.meta as any) ?? { page: 1, pageCount: 1 };
        setMeta({ page: m.page ?? page, pageCount: m.pageCount ?? 1, total: m.total });
      } catch {
        // keep previous data visible
      } finally {
        setLoading(false);
      }
    },
    [dateFrom, dateTo, statusFilter, invoiceQuery, cashierId]
  );

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

  const toggleExpand = async (sale: any) => {
    const id = Number(sale.id);
    const isOpen = expandedIds.has(id);
    if (isOpen) {
      setExpandedIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      return;
    }
    setExpandedIds((prev) => new Set(prev).add(id));
    if (receiptCache[id] || drawerLoadingId === id) return;
    setDrawerLoadingId(id);
    setDrawerErrors((prev) => {
      const n = { ...prev };
      delete n[id];
      return n;
    });
    try {
      const res = await fetchSaleReceipt(id);
      setReceiptCache((prev) => ({ ...prev, [id]: res.data }));
    } catch (e: any) {
      setDrawerErrors((prev) => ({ ...prev, [id]: e?.message || "Failed to load details" }));
    } finally {
      setDrawerLoadingId(null);
    }
  };

  const applyQuick = (range: (typeof QUICK_RANGES)[number]) => {
    const from = range.from();
    const to = range.to();
    setDateFrom(from);
    setDateTo(to);
    setActiveQuick(range.label);
  };

  const hasActiveFilters = Boolean(statusFilter || invoiceQuery || invoiceInput || cashierId);
  const clearFilters = () => {
    setStatusFilter("");
    setInvoiceInput("");
    setInvoiceQuery("");
    setCashierId("");
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

  const prevLabel = (() => {
    const r = getPreviousRange(dateFrom, dateTo);
    if (!r) return "no previous period";
    return `${r.dateFrom} → ${r.dateTo}`;
  })();

  const COLSPAN = 10;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Sales Transactions</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit store sales, inspect serialized IMEI records, and reprint receipts or download warranty invoices.
          </p>
          <p className="text-xs text-gray-400 mt-1">
            Showing: <span className="font-medium text-gray-600">{rangeLabel}</span>
            <span className="mx-1">·</span>
            vs prev: <span className="font-medium text-gray-600">{prevLabel}</span>
          </p>
        </div>
      </div>

      {/* ── Filters: date range + status + invoice + cashier ── */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-3 sm:p-4 space-y-3">
        {/* Row 1: quick pills + date inputs */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
          <div className="flex flex-wrap gap-1.5 sm:gap-2">
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

        {/* Row 2: status chips + invoice search + cashier + clear */}
        <div className="flex flex-col gap-3 border-t border-gray-100 pt-3">
          <div className="flex flex-col lg:flex-row lg:items-center gap-3">
            {/* Status chips */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium text-gray-500 whitespace-nowrap">Status</span>
              <div className="flex flex-wrap gap-1.5">
                {SALE_STATUSES.map((s) => (
                  <button
                    key={s.value || "all"}
                    onClick={() => setStatusFilter(s.value)}
                    className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                      statusFilter === s.value
                        ? "bg-gray-900 text-white border-gray-900"
                        : "bg-white text-gray-600 border-gray-300 hover:border-gray-400 hover:text-gray-900"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Invoice search + cashier + clear — grow to fill */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 lg:ml-auto w-full lg:w-auto">
              {/* Invoice — ILIKE %query% on backend :312 */}
              <div className="relative flex-1 sm:w-56 lg:w-64">
                <svg className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M10 18a8 8 0 110-16 8 8 0 010 16z" />
                </svg>
                <input
                  type="text"
                  value={invoiceInput}
                  onChange={(e) => setInvoiceInput(e.target.value)}
                  placeholder="Search invoice…"
                  className="w-full rounded-lg border border-gray-300 pl-8 pr-8 py-1.5 text-sm placeholder:text-gray-400 focus:border-blue-500 focus:outline-none"
                />
                {invoiceInput && (
                  <button
                    type="button"
                    onClick={() => {
                      setInvoiceInput("");
                      setInvoiceQuery("");
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Cashier dropdown — GET /users */}
              <select
                value={cashierId}
                onChange={(e) => setCashierId(e.target.value)}
                className="rounded-lg border border-gray-300 px-2.5 py-1.5 text-sm bg-white focus:border-blue-500 focus:outline-none sm:min-w-[160px]"
              >
                <option value="">All cashiers</option>
                {cashiers.map((u) => (
                  <option key={u.id} value={String(u.id)}>
                    {u.fullName} ({u.username})
                  </option>
                ))}
              </select>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 whitespace-nowrap"
                >
                  Clear filters
                </button>
              )}
            </div>
          </div>

          {/* Active filter summary */}
          {(hasActiveFilters || statusFilter) && (
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500">
              <span>Filters:</span>
              {statusFilter && (
                <span className="inline-flex items-center gap-1 rounded-full bg-gray-900 text-white px-2.5 py-0.5 text-xs font-medium">
                  {SALE_STATUSES.find((s) => s.value === statusFilter)?.label ?? statusFilter}
                  <button onClick={() => setStatusFilter("")} className="ml-0.5 hover:text-gray-200">×</button>
                </span>
              )}
              {invoiceQuery && (
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 text-blue-700 px-2.5 py-0.5 text-xs font-medium">
                  Invoice: {invoiceQuery}
                  <button onClick={() => { setInvoiceInput(""); setInvoiceQuery(""); }} className="ml-0.5 hover:text-blue-900">×</button>
                </span>
              )}
              {cashierId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 text-indigo-700 px-2.5 py-0.5 text-xs font-medium">
                  {cashiers.find((c) => String(c.id) === cashierId)?.fullName ?? `Cashier #${cashierId}`}
                  <button onClick={() => setCashierId("")} className="ml-0.5 hover:text-indigo-900">×</button>
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── KPI strip — re-uses fetchSalesSummary daily ─────── */}
      {kpiError && (
        <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          <span>{kpiError}</span>
          <button
            onClick={() => {
              setDateFrom((v) => v);
            }}
            className="text-xs font-semibold underline ml-4"
          >
            Retry
          </button>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2 sm:gap-4 lg:grid-cols-4">
        <KpiCard
          title="Grand Total"
          value={kpi ? fmtIDR(Math.round(kpi.cur.grandTotal)) : fmtIDR(0)}
          subtitle={
            kpi
              ? `${kpi.cur.txCount} tx · prev ${kpi.prev ? fmtIDR(Math.round(kpi.prev.grandTotal)) : "—"}`
              : "Revenue (COMPLETED/P.REFUNDED)"
          }
          delta={kpi ? kpi.deltas.grandTotal : { pct: null, dir: "flat" }}
          color="blue"
          loading={kpiLoading}
        />
        <KpiCard
          title="Transactions"
          value={kpi ? String(kpi.cur.txCount) : "0"}
          subtitle={
            kpi
              ? `prev ${kpi.prev ? kpi.prev.txCount : "—"} tx · ${kpi.cur.txCount ? (kpi.cur.grandTotal / kpi.cur.txCount).toLocaleString("id-ID", { maximumFractionDigits: 0 }) : "0"} avg/day`
              : "Count of sales in period"
          }
          delta={kpi ? kpi.deltas.txCount : { pct: null, dir: "flat" }}
          color="indigo"
          loading={kpiLoading}
        />
        <KpiCard
          title="Avg Basket"
          value={kpi ? fmtIDR(Math.round(kpi.cur.avgBasket)) : fmtIDR(0)}
          subtitle={
            kpi
              ? `grand_total / tx · prev ${kpi.prev ? fmtIDR(Math.round(kpi.prev.avgBasket)) : "—"}`
              : "Avg value per transaction"
          }
          delta={kpi ? kpi.deltas.avgBasket : { pct: null, dir: "flat" }}
          color="green"
          loading={kpiLoading}
        />
        <KpiCard
          title="Discount Rate"
          value={kpi ? `${kpi.cur.discountRate.toFixed(1)}%` : "0.0%"}
          subtitle={
            kpi
              ? `discount / subtotal · ${fmtIDR(Math.round(kpi.cur.discountTotal))} total disc.`
              : "Share of discount vs subtotal"
          }
          delta={kpi ? kpi.deltas.discountRate : { pct: null, dir: "flat" }}
          deltaInvert
          color="amber"
          loading={kpiLoading}
        />
      </div>
      {!kpiLoading && kpi && (
        <p className="text-[11px] text-gray-400 -mt-2 px-1">
          KPIs from <code className="font-mono">GET /reports/sales-summary?period=daily</code> — current vs previous equal-length period ({prevLabel}). Discount Rate = discount_total / subtotal.
        </p>
      )}

      {/* ── Mini trend chart — grand_total over period_start (no table scan) ── */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Sales trend</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              <code className="font-mono text-[11px]">grand_total</code> over <code className="font-mono text-[11px]">period_start</code> · {rangeLabel}
            </p>
          </div>
          <div className="inline-flex rounded-full border border-gray-200 p-0.5 bg-gray-50 self-start sm:self-auto">
            {CHART_PERIODS.map((p) => (
              <button
                key={p.value}
                onClick={() => setChartPeriod(p.value)}
                className={`rounded-full px-3.5 py-1 text-xs font-semibold transition-colors ${
                  chartPeriod === p.value
                    ? "bg-gray-900 text-white shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                }`}
                aria-pressed={chartPeriod === p.value}
                title={`GROUP BY date_trunc('${p.value === "monthly" ? "month" : p.value === "weekly" ? "week" : "day"}', sale_time) — backend reports.service.ts:19`}
              >
                <span className="sm:hidden">{p.short}</span>
                <span className="hidden sm:inline">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        <TrendChart data={chartData} period={chartPeriod} loading={chartLoading} error={chartError} />

        <p className="text-[11px] text-gray-400 mt-3">
          Source: <code className="font-mono">GET /reports/sales-summary?period={chartPeriod}</code> &amp;{` `}
          <code className="font-mono">date_trunc('{chartPeriod === "monthly" ? "month" : chartPeriod === "weekly" ? "week" : "day"}', sale_time)</code>
          {` `}— no table scanning, one aggregated query per toggle.
        </p>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                <th className="w-8 px-2 py-3" />
                <th className="px-3 sm:px-4 py-3 font-medium whitespace-nowrap">Invoice</th>
                <th className="px-2 sm:px-3 py-3 font-medium whitespace-nowrap">Date</th>
                <th className="px-2 sm:px-3 py-3 font-medium">Cashier</th>
                <th className="px-2 sm:px-3 py-3 font-medium">Customer</th>
                <th className="px-2 sm:px-3 py-3 font-medium text-center">Items</th>
                <th className="px-2 sm:px-3 py-3 font-medium">Payment</th>
                <th className="px-2 sm:px-4 py-3 font-medium whitespace-nowrap">Total</th>
                <th className="px-2 sm:px-3 py-3 font-medium">Status</th>
                <th className="px-2 sm:px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={COLSPAN} className="px-4 py-8 text-center text-gray-400">
                    Loading...
                  </td>
                </tr>
              )}
              {!loading && sales.length === 0 && (
                <tr>
                  <td colSpan={COLSPAN} className="px-4 py-8 text-center text-gray-400">
                    No sales for {rangeLabel}{hasActiveFilters ? " with current filters" : ""}
                  </td>
                </tr>
              )}
              {sales.map((s: any) => {
                const isExpanded = expandedIds.has(Number(s.id));
                const disc = parseFloat(s.discountTotal ?? s.discount_total ?? 0);
                const hasDiscount = disc > 0.005;
                const payments: any[] = s.payments ?? [];
                const primaryPay = payments[0]?.method ?? payments[0]?.method ?? null;
                const extraPays = payments.length > 1 ? `+${payments.length - 1}` : "";
                const customerName: string | null = s.customer?.name ?? s.customerName ?? null;
                return (
                  <>
                    <tr key={s.id} className={`border-b ${isExpanded ? "bg-blue-50/40 border-blue-100" : "border-gray-100 hover:bg-gray-50"}`}>
                      <td className="px-2 py-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => toggleExpand(s)}
                          aria-expanded={isExpanded}
                          aria-label={isExpanded ? "Collapse" : "Expand details"}
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-md border transition-colors ${isExpanded ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-500 border-gray-300 hover:bg-gray-50"}`}
                        >
                          <svg className={`w-3.5 h-3.5 transition-transform ${isExpanded ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                      </td>
                      <td className="px-3 sm:px-4 py-2.5 font-medium font-mono text-blue-700 whitespace-nowrap text-xs sm:text-sm">{s.invoiceNumber}</td>
                      <td className="px-2 sm:px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">
                        {new Date(s.saleTime).toLocaleString("id-ID", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                      <td className="px-2 sm:px-3 py-2.5 text-xs whitespace-nowrap max-w-[110px] truncate">{s.cashier?.fullName ?? s.cashierName ?? "-"}</td>
                      <td className="px-2 sm:px-3 py-2.5">
                        {customerName ? (
                          <span className="inline-flex max-w-[130px] items-center gap-1 truncate rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-700 border border-violet-200" title={customerName}>
                            <svg className="w-3 h-3 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                            <span className="truncate">{customerName}</span>
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">Walk-in</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-3 py-2.5 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-gray-900 text-white text-xs font-semibold px-2 py-0.5 min-w-[1.5rem]">
                          {s.items?.length ?? s.itemCount ?? 0}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 py-2.5 whitespace-nowrap">
                        {primaryPay ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 border border-sky-200 px-2 py-0.5 text-xs font-medium text-sky-700">
                            {formatMethodLabel(String(primaryPay))}
                            {extraPays && <span className="rounded-full bg-sky-600 text-white px-1 py-0 text-[10px] font-bold">{extraPays}</span>}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-2 sm:px-4 py-2.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium font-mono text-xs sm:text-sm">IDR {parseFloat(s.grandTotal ?? s.grand_total ?? 0).toLocaleString("id-ID")}</span>
                          {hasDiscount && (
                            <span title={`Discount ${fmtIDR(Math.round(disc))}`} className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 border border-amber-200 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm0 6a2 2 0 110-4 2 2 0 010 4z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" /></svg>
                              −{fmtCompactIDR(Math.round(disc)).replace("IDR ", "")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 py-2.5">
                        <span
                          className={`inline-flex rounded px-1.5 py-0.5 text-xs font-medium whitespace-nowrap ${
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
                      <td className="px-2 sm:px-4 py-2.5 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenReceipt(s.id)}
                            disabled={fetchingReceiptId === Number(s.id)}
                            className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50 whitespace-nowrap"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                            </svg>
                            <span>{fetchingReceiptId === Number(s.id) ? "..." : "Receipt"}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => downloadReceiptPdf(s.id)}
                            className="hidden sm:inline-flex items-center gap-1 rounded-md bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700 hover:bg-gray-200 border border-gray-300 transition-colors"
                          >
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${s.id}-drawer`} className="bg-gray-50/70">
                        <td colSpan={COLSPAN} className="p-0">
                          {drawerLoadingId === Number(s.id) && (
                            <div className="px-4 py-6 flex items-center gap-3 text-sm text-gray-500">
                              <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
                              Loading items, IMEIs, payments… <span className="text-xs text-gray-400">(GET /sales/{s.id}/receipt)</span>
                            </div>
                          )}
                          {drawerErrors[Number(s.id)] && drawerLoadingId !== Number(s.id) && (
                            <div className="px-4 py-4 flex items-center justify-between bg-red-50 border-y border-red-200">
                              <span className="text-sm text-red-700">{drawerErrors[Number(s.id)]}</span>
                              <button onClick={() => toggleExpand(s)} className="text-xs font-semibold text-red-700 underline">Retry</button>
                            </div>
                          )}
                          {receiptCache[Number(s.id)] && drawerLoadingId !== Number(s.id) && !drawerErrors[Number(s.id)] && (() => {
                            const r = receiptCache[Number(s.id)]!;
                            const paidTotal = (r.payments ?? []).reduce((acc: number, p: any) => acc + parseFloat(String(p.amount ?? 0)), 0);
                            const grand = parseFloat(String(r.grandTotal ?? 0));
                            const change = Math.max(0, paidTotal - grand);
                            return (
                              <div className="px-3 sm:px-4 py-4">
                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                  {/* Items + IMEIs */}
                                  <div className="lg:col-span-2 rounded-xl bg-white border border-gray-200 overflow-hidden">
                                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                      <span className="text-xs font-semibold text-gray-700">Items · {r.items?.length ?? 0}</span>
                                      <span className="text-xs text-gray-500 font-mono">{r.invoiceNumber}</span>
                                    </div>
                                    <div className="overflow-x-auto">
                                      <table className="w-full text-xs">
                                        <thead>
                                          <tr className="bg-white text-gray-500 border-b border-gray-100">
                                            <th className="text-left px-3 py-2 font-medium">Product</th>
                                            <th className="text-center px-2 py-2 font-medium">Qty</th>
                                            <th className="text-right px-2 py-2 font-medium">Unit</th>
                                            <th className="text-right px-2 py-2 font-medium">Disc.</th>
                                            <th className="text-right px-3 py-2 font-medium">Line Total</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {(r.items ?? []).map((it: any, idx: number) => (
                                            <tr key={it.id ?? idx} className="border-b border-gray-100 last:border-0">
                                              <td className="px-3 py-2.5 align-top">
                                                <div className="font-medium text-gray-900 leading-tight">{it.productName}</div>
                                                {it.sku && <div className="font-mono text-[11px] text-gray-400">{it.sku} · {it.productType ?? ""}</div>}
                                                {it.imeis && it.imeis.length > 0 && (
                                                  <div className="mt-1.5 flex flex-wrap gap-1">
                                                    {it.imeis.map((im: any, j: number) => (
                                                      <span key={im.imei ?? j} className="inline-flex items-center gap-1 rounded-md bg-amber-50 border border-amber-200 px-1.5 py-0.5 font-mono text-[11px] text-amber-800" title={`${im.imei}${im.conditionGrade ? " · " + im.conditionGrade : ""}${im.batteryHealth ? " · " + im.batteryHealth + "%" : ""}`}>
                                                        <svg className="w-3 h-3 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                                        {im.imei}
                                                      </span>
                                                    ))}
                                                  </div>
                                                )}
                                              </td>
                                              <td className="px-2 py-2.5 text-center font-semibold">×{it.qty}</td>
                                              <td className="px-2 py-2.5 text-right font-mono">IDR {parseFloat(String(it.unitPrice ?? 0)).toLocaleString("id-ID")}</td>
                                              <td className="px-2 py-2.5 text-right font-mono text-amber-700">{parseFloat(String(it.discountAmount ?? 0)) > 0 ? `−IDR ${parseFloat(String(it.discountAmount)).toLocaleString("id-ID")}` : "—"}</td>
                                              <td className="px-3 py-2.5 text-right font-mono font-semibold">IDR {parseFloat(String(it.lineTotal ?? 0)).toLocaleString("id-ID")}</td>
                                            </tr>
                                          ))}
                                          {(!r.items || r.items.length === 0) && (
                                            <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No items</td></tr>
                                          )}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>

                                  {/* Totals + payments + change */}
                                  <div className="rounded-xl bg-white border border-gray-200 p-3 sm:p-4 space-y-3">
                                    <h4 className="text-xs font-semibold text-gray-900">Summary</h4>
                                    <div className="space-y-1.5 text-xs">
                                      <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span className="font-mono font-medium">IDR {parseFloat(String(r.subtotal ?? 0)).toLocaleString("id-ID")}</span></div>
                                      <div className="flex justify-between"><span className="text-gray-500">Discount</span><span className="font-mono font-medium text-amber-700">−IDR {parseFloat(String(r.discountTotal ?? 0)).toLocaleString("id-ID")}</span></div>
                                      <div className="flex justify-between"><span className="text-gray-500">Tax</span><span className="font-mono font-medium">IDR {parseFloat(String(r.taxTotal ?? 0)).toLocaleString("id-ID")}</span></div>
                                      <div className="flex justify-between border-t border-gray-100 pt-1.5 font-semibold"><span>Grand Total</span><span className="font-mono">IDR {parseFloat(String(r.grandTotal ?? 0)).toLocaleString("id-ID")}</span></div>
                                    </div>

                                    <div className="border-t border-gray-100 pt-3">
                                      <h5 className="text-xs font-semibold text-gray-700 mb-1.5">Payments</h5>
                                      <div className="space-y-1.5">
                                        {(r.payments ?? []).map((p: any, i: number) => (
                                          <div key={p.id ?? i} className="flex items-center justify-between rounded-lg bg-gray-50 border border-gray-100 px-2.5 py-1.5">
                                            <span className="inline-flex items-center rounded-full bg-sky-100 border border-sky-200 px-2 py-0.5 text-xs font-semibold text-sky-700">{formatMethodLabel(String(p.method))}</span>
                                            <span className="font-mono text-xs font-medium">IDR {parseFloat(String(p.amount ?? 0)).toLocaleString("id-ID")}</span>
                                          </div>
                                        ))}
                                        {(!r.payments || r.payments.length === 0) && <p className="text-xs text-gray-400">No payments recorded</p>}
                                      </div>
                                      <div className="mt-2.5 grid grid-cols-2 gap-2">
                                        <div className="rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5">
                                          <div className="text-[11px] text-emerald-700 font-medium">Paid</div>
                                          <div className="font-mono text-xs font-bold text-emerald-800">IDR {paidTotal.toLocaleString("id-ID")}</div>
                                        </div>
                                        <div className={`rounded-lg border px-2.5 py-1.5 ${change > 0 ? "bg-amber-50 border-amber-200" : "bg-gray-50 border-gray-200"}`}>
                                          <div className={`text-[11px] font-medium ${change > 0 ? "text-amber-700" : "text-gray-500"}`}>Change</div>
                                          <div className={`font-mono text-xs font-bold ${change > 0 ? "text-amber-800" : "text-gray-700"}`}>IDR {change.toLocaleString("id-ID")}</div>
                                        </div>
                                      </div>
                                    </div>

                                    {r.customer && (
                                      <div className="border-t border-gray-100 pt-3">
                                        <h5 className="text-xs font-semibold text-gray-700">Customer</h5>
                                        <p className="text-sm font-medium text-gray-900 mt-1">{r.customer.name}</p>
                                        {(r.customer.phone || r.customer.email) && <p className="text-xs text-gray-500">{[r.customer.phone, r.customer.email].filter(Boolean).join(" · ")}</p>}
                                      </div>
                                    )}
                                    {r.notes && <p className="text-xs text-gray-500 border-t border-gray-100 pt-3"><span className="font-medium text-gray-700">Notes:</span> {r.notes}</p>}
                                  </div>
                                </div>
                              </div>
                            );
                          })()}
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination — wired to filtered query */}
      {meta.pageCount > 1 && (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">
            Page {meta.page} of {meta.pageCount}
            {typeof meta.total === "number" ? ` · ${meta.total} total` : ""}
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
