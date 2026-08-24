"use client";

import Link from "next/link";
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  apiFetch,
  downloadReceiptPdf,
  downloadReportCsv,
  fetchAuditLogs,
  fetchPaymentBreakdown,
  fetchSaleReceipt,
  fetchSalesByCashier,
  fetchSalesSummary,
  fetchUsers,
  AuditLogItem,
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
    <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Payment Mix
        </h3>
        <span className="text-xs font-semibold text-gray-700">
          {loading ? "..." : fmtIDR(Math.round(total))}
        </span>
      </div>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 rounded bg-gray-100" />
          <div className="h-3 rounded bg-gray-100" />
          <div className="h-3 rounded bg-gray-100" />
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-gray-400 py-3 text-center">No payment data</p>
      ) : (
        <div className="space-y-2.5">
          {items.map((item) => {
            const amount = parseFloat(item.total_amount || 0);
            const pct = total > 0 ? (amount / total) * 100 : 0;
            return (
              <div key={item.method} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-gray-700">
                    {formatMethodLabel(item.method)}
                    <span className="text-gray-400 font-normal ml-1">
                      ({item.transaction_count} tx)
                    </span>
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gray-900 font-semibold">
                      {fmtCompactIDR(Math.round(amount))}
                    </span>
                    <span className="text-gray-400 font-mono text-[11px] w-10 text-right">
                      {pct.toFixed(0)}%
                    </span>
                  </div>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
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
  const topSalesPersons = useMemo(() => items.slice(0, 5), [items]);
  const maxSales = useMemo(
    () => Math.max(...items.map((c) => parseFloat(c.total_sales || 0)), 1),
    [items]
  );

  return (
    <div className="rounded-xl bg-white shadow-sm border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-500">
          Sales Person Leaderboard
        </h3>
        <span className="text-xs text-gray-400">{items.length} sales staff</span>
      </div>
      {loading ? (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 rounded bg-gray-100" />
          <div className="h-3 rounded bg-gray-100" />
          <div className="h-3 rounded bg-gray-100" />
        </div>
      ) : topSalesPersons.length === 0 ? (
        <p className="text-xs text-gray-400 py-3 text-center">No sales person data</p>
      ) : (
        <div className="space-y-2.5">
          {topSalesPersons.map((c, idx) => {
            const sales = parseFloat(c.total_sales || 0);
            const pct = (sales / maxSales) * 100;
            const personName =
              c.sales_person_name || c.full_name || c.cashier_name || "Unknown";
            return (
              <div key={c.sales_person_id ?? c.cashier_id ?? idx} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5 truncate max-w-[65%]">
                    <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-gray-100 text-[10px] font-bold text-gray-600">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-gray-700 truncate">
                      {personName}
                    </span>
                    <span className="text-gray-400 font-normal text-[11px]">
                      · {c.transaction_count} tx
                    </span>
                  </div>
                  <span className="font-mono text-gray-900 font-semibold">
                    {fmtCompactIDR(Math.round(sales))}
                  </span>
                </div>
                <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
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

// ── Void Audit Modal ──────────────────────────────────────────
function VoidAuditModal({
  sale,
  isOpen,
  onClose,
}: {
  sale: any | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !sale) return;
    setLoading(true);
    setError(null);
    fetchAuditLogs({ entityType: "SALE", action: "SALE_VOIDED", limit: 50 })
      .then((res) => {
        const matching = ((res as any)?.data ?? []).filter(
          (l: any) =>
            Number(l.entityId) === Number(sale.id) ||
            l.metadataJson?.invoiceNumber === sale.invoiceNumber
        );
        setLogs(matching);
      })
      .catch((e: any) => setError(e?.message || "Failed to load audit log"))
      .finally(() => setLoading(false));
  }, [isOpen, sale]);

  if (!isOpen || !sale) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-bold text-red-700">
              VOID AUDIT
            </span>
            <span className="font-mono text-sm font-semibold text-gray-900">
              {sale.invoiceNumber}
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-lg font-bold"
          >
            ×
          </button>
        </div>

        {loading ? (
          <div className="py-8 text-center text-sm text-gray-500">
            <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2" />
            Loading void audit logs...
          </div>
        ) : error ? (
          <div className="p-3 rounded-lg bg-red-50 text-red-700 text-xs">{error}</div>
        ) : logs.length === 0 ? (
          <div className="py-6 text-center text-sm text-gray-500 space-y-1">
            <p>No explicit void audit log found in recent records.</p>
            <p className="text-xs text-gray-400 font-mono">Sale ID #{sale.id}</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {logs.map((log) => (
              <div
                key={log.id}
                className="rounded-xl border border-gray-200 bg-gray-50/70 p-3.5 space-y-2 text-xs"
              >
                <div className="flex items-center justify-between font-medium">
                  <span className="text-gray-900 font-semibold">
                    {log.user?.fullName || log.user?.username || `User #${log.userId || "-"}`}
                  </span>
                  <span className="text-gray-500 font-mono text-[11px]">
                    {new Date(log.eventTime).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="text-gray-600 space-y-0.5">
                  <p>
                    <span className="text-gray-400">Action:</span>{" "}
                    <code className="font-mono font-semibold text-red-600">{log.action}</code>
                  </p>
                  {log.ipAddress && (
                    <p>
                      <span className="text-gray-400">IP Address:</span>{" "}
                      <span className="font-mono">{log.ipAddress}</span>
                    </p>
                  )}
                  {log.metadataJson && (
                    <div className="mt-1 pt-1.5 border-t border-gray-200/60 font-mono text-[11px] text-gray-700">
                      {Object.entries(log.metadataJson).map(([k, v]) => (
                        <div key={k} className="flex justify-between">
                          <span className="text-gray-400">{k}:</span>
                          <span>{String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-gray-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-black"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
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

  const [exporting, setExporting] = useState(false);

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

  // ── Operations mix: Payment Breakdown + Cashier Leaderboard ─
  const [paymentMix, setPaymentMix] = useState<any[]>([]);
  const [cashierSales, setCashierSales] = useState<any[]>([]);
  const [opsLoading, setOpsLoading] = useState(true);
  const [voidAuditSale, setVoidAuditSale] = useState<any | null>(null);

  // ── Operational mix fetch (payment breakdown + cashier tally) ─
  useEffect(() => {
    let cancelled = false;
    async function runOps() {
      setOpsLoading(true);
      try {
        const [pRes, cRes] = await Promise.all([
          fetchPaymentBreakdown({
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          }),
          fetchSalesByCashier({
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
          }),
        ]);
        if (cancelled) return;
        const pRows = (pRes as any)?.data?.data ?? (pRes as any)?.data ?? [];
        const cRows = (cRes as any)?.data?.data ?? (cRes as any)?.data ?? [];
        setPaymentMix(Array.isArray(pRows) ? pRows : []);
        setCashierSales(Array.isArray(cRows) ? cRows : []);
      } catch {
        // keep previous state
      } finally {
        if (!cancelled) setOpsLoading(false);
      }
    }
    runOps();
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

  // ponytail: single CSV path (sales-summary); add per-report menu if more exports needed
  const handleExportCsv = async () => {
    setExporting(true);
    try {
      const q = new URLSearchParams({ period: "daily" });
      if (dateFrom) q.set("dateFrom", dateFrom);
      if (dateTo) q.set("dateTo", dateTo);
      await downloadReportCsv(`/reports/sales-summary/csv?${q.toString()}`, `sales-summary-${dateFrom || "all"}-${dateTo || "all"}-daily.csv`);
    } catch (e: any) {
      alert(e?.message || "Export failed");
    } finally {
      setExporting(false);
    }
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
      <div className="flex items-center justify-between gap-3">
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
        <button
          type="button"
          onClick={handleExportCsv}
          disabled={exporting}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-gray-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-50"
        >
          {exporting ? <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> : <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>}
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
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

      {/* ── Operational Mix: Payment breakdown & Sales person leaderboard ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <PaymentBreakdownCard data={paymentMix} loading={opsLoading} />
        <SalesPersonLeaderboardCard data={cashierSales} loading={opsLoading} />
      </div>

      {/* ── Quick link to Reports deep-dive ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-3.5 px-4 text-xs">
        <div className="text-gray-700">
          <span className="font-semibold text-blue-900">Need deeper analytics?</span> Inspect gross profit margins, inventory valuation, and product performance in Reports.
        </div>
        <Link
          href="/reports"
          className="inline-flex items-center gap-1 font-semibold text-blue-700 hover:text-blue-900 shrink-0"
        >
          Open Reports & Analytics
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
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
                  <Fragment key={s.id}>
                    <tr className={`border-b ${isExpanded ? "bg-blue-50/40 border-blue-100" : "border-gray-100 hover:bg-gray-50"}`}>
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
                        <div className="flex flex-col gap-1 items-start">
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
                          {s.status === "VOIDED" && (
                            <button
                              type="button"
                              onClick={() => setVoidAuditSale(s)}
                              className="text-[10px] font-semibold text-red-600 hover:text-red-800 underline inline-flex items-center gap-0.5"
                            >
                              Audit Log
                            </button>
                          )}
                        </div>
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
                  </Fragment>
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

      {/* Void Audit Modal */}
      <VoidAuditModal
        sale={voidAuditSale}
        isOpen={Boolean(voidAuditSale)}
        onClose={() => setVoidAuditSale(null)}
      />
    </div>
  );
}
