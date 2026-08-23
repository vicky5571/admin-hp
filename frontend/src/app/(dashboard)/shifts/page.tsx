"use client";

import { useEffect, useState } from "react";
import { CashierShift, fetchShifts } from "@/lib/api";
import ShiftStatusModal from "@/components/ShiftStatusModal";

export default function ShiftsPage() {
  const [shifts, setShifts] = useState<CashierShift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);

  const loadShifts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchShifts({
        status: statusFilter === "ALL" ? undefined : statusFilter,
        limit: 50,
      });
      setShifts(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shifts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadShifts();
  }, [statusFilter]);

  // Compute KPI Stats
  const openShiftsCount = shifts.filter((s) => s.status === "OPEN").length;
  const totalCashCollected = shifts.reduce(
    (sum, s) => sum + (parseFloat(s.totalCashSales) || 0),
    0,
  );
  const totalDiscrepancies = shifts.reduce(
    (sum, s) => sum + (parseFloat(s.cashDifference || "0") || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Register Shifts & Cash Reconciliation
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Cash drawer audit trails, shift opening/closing floats, and X/Z settlement reports.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsShiftModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition-colors"
          >
            <span>💵</span>
            <span>Open / Manage Register Shift</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Active Open Registers
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold text-sm">
              🟢
            </span>
          </div>
          <p className="text-2xl font-extrabold text-gray-900 mt-2 font-mono">
            {openShiftsCount}
          </p>
          <span className="text-[11px] text-gray-500 font-medium">
            Currently accepting cashier transactions
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700">
              Total Cash Intake
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 font-bold text-sm">
              💵
            </span>
          </div>
          <p className="text-2xl font-extrabold text-emerald-800 mt-2 font-mono">
            IDR {totalCashCollected.toLocaleString("id-ID")}
          </p>
          <span className="text-[11px] text-gray-500 font-medium">
            Across {shifts.length} recorded shifts
          </span>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
              Net Cash Discrepancy
            </span>
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 font-bold text-sm">
              ⚖️
            </span>
          </div>
          <p
            className={`text-2xl font-extrabold mt-2 font-mono ${
              totalDiscrepancies === 0
                ? "text-emerald-700"
                : totalDiscrepancies > 0
                  ? "text-blue-700"
                  : "text-rose-700"
            }`}
          >
            {totalDiscrepancies >= 0 ? "+" : ""}
            IDR {totalDiscrepancies.toLocaleString("id-ID")}
          </p>
          <span className="text-[11px] text-gray-500 font-medium">
            {totalDiscrepancies === 0
              ? "All closed registers balanced"
              : totalDiscrepancies > 0
                ? "Net cash overage across registers"
                : "Net cash shortage across registers"}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        {["ALL", "OPEN", "CLOSED"].map((st) => (
          <button
            key={st}
            type="button"
            onClick={() => setStatusFilter(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
              statusFilter === st
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {st === "ALL" ? "All Shifts" : st === "OPEN" ? "🟢 Open Now" : "🔒 Closed"}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-xs">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading cashier shifts...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 font-medium">
            ⚠️ {error}
          </div>
        ) : shifts.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No cashier shifts found for this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-gray-200 bg-slate-50 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Shift ID / Terminal</th>
                  <th className="px-4 py-3">Cashier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Opened</th>
                  <th className="px-4 py-3">Closed</th>
                  <th className="px-4 py-3 text-right">Opening Float</th>
                  <th className="px-4 py-3 text-right">Cash Sales</th>
                  <th className="px-4 py-3 text-right">Expected Drawer</th>
                  <th className="px-4 py-3 text-right">Actual Counted</th>
                  <th className="px-4 py-3 text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {shifts.map((s) => {
                  const diff = parseFloat(s.cashDifference || "0");
                  return (
                    <tr key={s.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-bold text-gray-900">
                          Shift #{s.id}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          {s.registerName}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-800">
                        {s.user?.fullName ?? `User #${s.userId}`}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            s.status === "OPEN"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {s.status === "OPEN" ? "🟢 OPEN" : "CLOSED"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-600 font-mono">
                        {new Date(s.openedAt).toLocaleString("id-ID", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-600 font-mono">
                        {s.closedAt
                          ? new Date(s.closedAt).toLocaleString("id-ID", {
                              dateStyle: "short",
                              timeStyle: "short",
                            })
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-700">
                        IDR {parseFloat(s.openingBalance).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-semibold text-emerald-700">
                        +IDR {parseFloat(s.totalCashSales).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold text-blue-900">
                        IDR {parseFloat(s.expectedEndingCash).toLocaleString("id-ID")}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-gray-900">
                        {s.actualEndingCash
                          ? `IDR ${parseFloat(s.actualEndingCash).toLocaleString("id-ID")}`
                          : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {s.status === "CLOSED" ? (
                          <span
                            className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                              diff === 0
                                ? "text-emerald-700 bg-emerald-50"
                                : diff > 0
                                  ? "text-blue-700 bg-blue-50"
                                  : "text-rose-700 bg-rose-50"
                            }`}
                          >
                            {diff >= 0 ? "+" : ""}
                            {diff.toLocaleString("id-ID")}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-[10px]">In Progress</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shift Drawer Modal */}
      <ShiftStatusModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onShiftUpdated={() => loadShifts()}
      />
    </div>
  );
}
