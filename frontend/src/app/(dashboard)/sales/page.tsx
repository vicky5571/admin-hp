"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  apiFetch,
  downloadReceiptPdf,
  fetchSaleReceipt,
  fetchSalesSummary,
  ReceiptPayload,
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

export default function SalesPage() {
  // ── filters / KPI state ─────────────────────────────────────
  const [dateFrom, setDateFrom] = useState(daysAgo(29));
  const [dateTo, setDateTo] = useState(today());
  const [activeQuick, setActiveQuick] = useState("Last 30 days");
  const [kpiLoading, setKpiLoading] = useState(true);
  const [kpiError, setKpiError] = useState<string | null>(null);
  const [kpi, setKpi] = useState<{
    cur: SummaryAgg;
    prev: SummaryAgg | null;
    deltas: Record<string, { pct: number | null; dir: "up" | "down" | "flat" }>;
  } | null>(null);

  // ── table state ─────────────────────────────────────────────
  const [sales, setSales] = useState<any[]>([]);
  const [meta, setMeta] = useState<{ page: number; pageCount: number }>({
    page: 1,
    pageCount: 1,
  });
  const [loading, setLoading] = useState(true);
  const [selectedReceipt, setSelectedReceipt] = useState<ReceiptPayload | null>(null);
  const [fetchingReceiptId, setFetchingReceiptId] = useState<number | null>(null);

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

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const q = new URLSearchParams();
        q.set("page", String(page));
        q.set("limit", "20");
        if (dateFrom) q.set("dateFrom", dateFrom);
        if (dateTo) q.set("dateTo", dateTo);
        const res = await apiFetch<any>(`/sales?${q.toString()}`);
        setSales(res.data ?? []);
        setMeta((res.meta as any) ?? { page: 1, pageCount: 1 });
      } catch {
        // keep previous data visible
      } finally {
        setLoading(false);
      }
    },
    [dateFrom, dateTo]
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

  const applyQuick = (range: (typeof QUICK_RANGES)[number]) => {
    const from = range.from();
    const to = range.to();
    setDateFrom(from);
    setDateTo(to);
    setActiveQuick(range.label);
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

      {/* ── Date range filter (mirrors reports) ─────────────── */}
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-3 sm:p-4">
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
                    No sales for {rangeLabel}
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

      {/* Pagination — wired to filtered query */}
      {meta.pageCount > 1 && (
        <div className="flex items-center justify-between">
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
