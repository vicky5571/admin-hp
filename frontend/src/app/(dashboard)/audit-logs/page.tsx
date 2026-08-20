"use client";

import { useEffect, useMemo, useState } from "react";
import { AuditLogItem, fetchAuditLogs } from "@/lib/api";

const ACTION_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  LOGIN_SUCCESS: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  LOGIN_FAILED: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  SALE_CREATED: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  SALE_VOIDED: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  RETURN_CREATED: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  PO_CREATED: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  PO_SUBMITTED: { bg: "bg-sky-50", text: "text-sky-700", border: "border-sky-200" },
  PO_APPROVED: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
  PO_REJECTED: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  PO_CANCELLED: { bg: "bg-gray-100", text: "text-gray-700", border: "border-gray-300" },
  GOODS_RECEIPT_CREATED: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  PRODUCT_CREATED: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  PRODUCT_UPDATED: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  PRODUCT_DELETED: { bg: "bg-red-50", text: "text-red-700", border: "border-red-200" },
  USER_CREATED: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  USER_UPDATED: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  SETTINGS_UPDATED: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [expandedLogId, setExpandedLogId] = useState<number | null>(null);

  const loadLogs = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchAuditLogs({
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        limit: 100,
      });
      setLogs(res.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [actionFilter, entityFilter, dateFrom, dateTo]);

  // Distinct actions and entity types for filter dropdowns
  const availableActions = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) if (l.action) set.add(l.action);
    return Array.from(set).sort();
  }, [logs]);

  const availableEntities = useMemo(() => {
    const set = new Set<string>();
    for (const l of logs) if (l.entityType) set.add(l.entityType);
    return Array.from(set).sort();
  }, [logs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
              System Audit Trail
            </h1>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
              {logs.length} Entries
            </span>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Immutable security log recording authentication events, POS transactions, inventory receipts, and system changes.
          </p>
        </div>

        <button
          type="button"
          onClick={loadLogs}
          className="inline-flex items-center justify-center rounded-xl bg-white border border-gray-300 px-4 py-2 text-xs font-semibold text-gray-700 shadow-xs hover:bg-gray-50 transition-colors"
        >
          <svg className="w-3.5 h-3.5 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh Logs
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 border border-rose-200 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="font-bold text-rose-600">
            &times;
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="rounded-2xl bg-white p-4 border border-gray-200 shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
          {/* Action Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
              Event Action
            </label>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-gray-300 bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Actions</option>
              {availableActions.map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </div>

          {/* Entity Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
              Entity Type
            </label>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-gray-300 bg-white focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Entities</option>
              {availableEntities.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>

          {/* Date From */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
              Date From
            </label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-gray-300 bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>

          {/* Date To */}
          <div>
            <label className="block text-[11px] font-semibold text-gray-500 uppercase mb-1">
              Date To
            </label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg border border-gray-300 bg-white focus:border-blue-500 focus:outline-none"
            />
          </div>
        </div>

        {(actionFilter || entityFilter || dateFrom || dateTo) && (
          <div className="flex justify-end pt-2 border-t border-gray-100 mt-3 text-xs">
            <button
              onClick={() => {
                setActionFilter("");
                setEntityFilter("");
                setDateFrom("");
                setDateTo("");
              }}
              className="text-blue-600 hover:underline font-semibold"
            >
              Reset Filters
            </button>
          </div>
        )}
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/75 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3.5">Timestamp</th>
                <th className="px-4 py-3.5">User / Actor</th>
                <th className="px-4 py-3.5">Action</th>
                <th className="px-4 py-3.5">Entity</th>
                <th className="px-4 py-3.5">IP Address</th>
                <th className="px-4 py-3.5 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                      <span>Loading audit records...</span>
                    </div>
                  </td>
                </tr>
              )}
              {!loading && logs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500 text-xs">
                    No audit records found matching your filters.
                  </td>
                </tr>
              )}
              {logs.map((log) => {
                const color = ACTION_COLORS[log.action] || {
                  bg: "bg-gray-100",
                  text: "text-gray-700",
                  border: "border-gray-200",
                };
                const isExpanded = expandedLogId === log.id;
                const formattedDate = new Date(log.eventTime).toLocaleString("id-ID", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  second: "2-digit",
                });

                return (
                  <tr key={log.id} className="hover:bg-gray-50/75 transition-colors">
                    {/* Timestamp */}
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-600">
                      {formattedDate}
                    </td>

                    {/* User */}
                    <td className="px-4 py-3.5">
                      {log.user ? (
                        <div>
                          <span className="font-semibold text-gray-900 text-xs">
                            {log.user.fullName}
                          </span>
                          <span className="text-gray-400 font-mono text-[11px] ml-1.5">
                            (@{log.user.username})
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs italic">System / Unauthenticated</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3.5">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold border ${color.bg} ${color.text} ${color.border}`}
                      >
                        {log.action}
                      </span>
                    </td>

                    {/* Entity */}
                    <td className="px-4 py-3.5 text-xs text-gray-600 font-mono">
                      <span>{log.entityType}</span>
                      {log.entityId && (
                        <span className="text-gray-400 ml-1">#{log.entityId}</span>
                      )}
                    </td>

                    {/* IP Address */}
                    <td className="px-4 py-3.5 font-mono text-xs text-gray-500">
                      {log.ipAddress || "—"}
                    </td>

                    {/* Metadata Toggle */}
                    <td className="px-4 py-3.5 text-right">
                      {log.metadataJson && Object.keys(log.metadataJson).length > 0 ? (
                        <button
                          type="button"
                          onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-semibold transition-colors"
                        >
                          <span>{isExpanded ? "Hide" : "View"} Payload</span>
                        </button>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Metadata Detail Modal */}
      {expandedLogId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Audit Payload Data
                </h3>
                <p className="text-xs text-gray-500">Log Entry #{expandedLogId}</p>
              </div>
              <button
                type="button"
                onClick={() => setExpandedLogId(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="bg-slate-900 text-slate-100 rounded-xl p-4 font-mono text-xs overflow-x-auto max-h-72">
              <pre>
                {JSON.stringify(
                  logs.find((l) => l.id === expandedLogId)?.metadataJson || {},
                  null,
                  2,
                )}
              </pre>
            </div>

            <div className="flex justify-end pt-3 mt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setExpandedLogId(null)}
                className="rounded-lg bg-blue-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-blue-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
