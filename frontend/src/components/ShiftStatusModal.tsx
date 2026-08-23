"use client";

import { useEffect, useState } from "react";
import {
  CashierShift,
  ShiftReport,
  closeShift,
  fetchCurrentShift,
  fetchShiftReport,
  openShift,
  recordCashMovement,
} from "@/lib/api";

interface ShiftStatusModalProps {
  isOpen: boolean;
  onClose: () => void;
  onShiftUpdated?: (shift: CashierShift | null) => void;
}

type ModalView =
  | "STATUS"
  | "OPEN_FORM"
  | "CASH_MOVEMENT"
  | "CLOSE_FORM"
  | "REPORT_VIEW";

const FLOAT_PRESETS = [100000, 200000, 300000, 500000, 1000000];

export default function ShiftStatusModal({
  isOpen,
  onClose,
  onShiftUpdated,
}: ShiftStatusModalProps) {
  const [currentShift, setCurrentShift] = useState<CashierShift | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [view, setView] = useState<ModalView>("STATUS");

  // Open Shift State
  const [openRegisterName, setOpenRegisterName] = useState("Register 1");
  const [openFloatAmount, setOpenFloatAmount] = useState("200000");
  const [openNotes, setOpenNotes] = useState("");

  // Cash Movement State
  const [movementType, setMovementType] = useState<"CASH_IN" | "CASH_OUT">(
    "CASH_IN",
  );
  const [movementAmount, setMovementAmount] = useState("");
  const [movementReason, setMovementReason] = useState("");

  // Close Shift State
  const [countedCash, setCountedCash] = useState("");
  const [closeNotes, setCloseNotes] = useState("");

  // Report State
  const [reportData, setReportData] = useState<ShiftReport | null>(null);

  // Load active shift on modal open
  const loadActiveShift = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchCurrentShift();
      const shift = res.data;
      setCurrentShift(shift);
      if (onShiftUpdated) onShiftUpdated(shift);
      if (!shift) {
        setView("OPEN_FORM");
      } else {
        setView("STATUS");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load shift");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadActiveShift();
    }
  }, [isOpen]);

  // Handle Open Shift
  const handleOpenShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const floatNum = parseFloat(openFloatAmount) || 0;
    if (floatNum < 0) {
      setError("Opening float amount cannot be negative");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await openShift({
        registerName: openRegisterName.trim() || "Register 1",
        openingBalance: floatNum,
        notes: openNotes.trim() || undefined,
      });
      setCurrentShift(res.data);
      if (onShiftUpdated) onShiftUpdated(res.data);
      setSuccessMsg("Register shift opened successfully!");
      setView("STATUS");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to open shift");
    } finally {
      setLoading(false);
    }
  };

  // Handle Record Cash Movement (Cash In / Out)
  const handleRecordMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(movementAmount) || 0;
    if (amt <= 0) {
      setError("Please enter a valid positive amount");
      return;
    }
    if (!movementReason.trim()) {
      setError("Please specify a reason for this cash movement");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await recordCashMovement({
        movementType,
        amount: amt,
        reason: movementReason.trim(),
      });
      setMovementAmount("");
      setMovementReason("");
      setSuccessMsg(
        `Recorded ${movementType === "CASH_IN" ? "Cash In" : "Cash Out"} of IDR ${amt.toLocaleString("id-ID")}`,
      );
      await loadActiveShift();
      setView("STATUS");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to record cash movement",
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle Close Shift
  const handleCloseShift = async (e: React.FormEvent) => {
    e.preventDefault();
    const counted = parseFloat(countedCash) || 0;
    if (counted < 0) {
      setError("Counted cash cannot be negative");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const res = await closeShift({
        actualEndingCash: counted,
        notes: closeNotes.trim() || undefined,
      });

      // Load Z-Report for closed shift
      const rep = await fetchShiftReport(res.data.id);
      setReportData(rep.data);
      setCurrentShift(null);
      if (onShiftUpdated) onShiftUpdated(null);
      setSuccessMsg("Register shift closed successfully!");
      setView("REPORT_VIEW");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to close shift");
    } finally {
      setLoading(false);
    }
  };

  // Handle View X-Report
  const handleViewXReport = async () => {
    if (!currentShift) return;
    setLoading(true);
    setError("");
    try {
      const rep = await fetchShiftReport(currentShift.id);
      setReportData(rep.data);
      setView("REPORT_VIEW");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to generate X-Report",
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const expectedCashNum = currentShift
    ? parseFloat(currentShift.expectedEndingCash || "0")
    : 0;
  const countedNum = parseFloat(countedCash) || 0;
  const variance = countedNum - expectedCashNum;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl max-h-[92vh] rounded-2xl bg-white shadow-2xl border border-gray-200 flex flex-col overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-200 bg-gray-50 print:hidden">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-8 w-8 items-center justify-center rounded-lg font-bold text-white shadow-xs ${
                currentShift ? "bg-emerald-600" : "bg-amber-500"
              }`}
            >
              {currentShift ? "💵" : "🔒"}
            </div>
            <div>
              <h3 className="text-sm font-bold text-gray-900">
                {currentShift
                  ? `Shift #${currentShift.id} (${currentShift.registerName})`
                  : "Register Shift Management"}
              </h3>
              <p className="text-[11px] text-gray-500 font-medium">
                {currentShift
                  ? `Opened by ${currentShift.user?.fullName ?? "Cashier"} at ${new Date(currentShift.openedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                  : "No open shift. Open a shift to begin checkout."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {view !== "STATUS" && currentShift && view !== "REPORT_VIEW" && (
              <button
                type="button"
                onClick={() => setView("STATUS")}
                className="px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-200 rounded-lg font-medium"
              >
                ← Back
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 font-bold text-lg p-1"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Alerts */}
        <div className="px-5 pt-3 print:hidden">
          {successMsg && (
            <div className="rounded-lg bg-emerald-50 px-3.5 py-2 text-xs text-emerald-800 border border-emerald-200 flex items-center justify-between mb-2">
              <span>✓ {successMsg}</span>
              <button
                onClick={() => setSuccessMsg("")}
                className="font-bold text-emerald-600"
              >
                &times;
              </button>
            </div>
          )}
          {error && (
            <div className="rounded-lg bg-rose-50 px-3.5 py-2 text-xs text-rose-700 border border-rose-200 flex items-center justify-between mb-2">
              <span>⚠️ {error}</span>
              <button
                onClick={() => setError("")}
                className="font-bold text-rose-600"
              >
                &times;
              </button>
            </div>
          )}
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5">
          {/* VIEW: OPEN_FORM */}
          {view === "OPEN_FORM" && (
            <form onSubmit={handleOpenShift} className="space-y-4">
              <div className="p-4 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-900">
                <p className="font-bold mb-0.5">Start Cash Register Shift</p>
                <p className="text-[11px] text-amber-800">
                  Enter initial cash drawer float before recording sales and
                  taking payments.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Register Terminal Name:
                </label>
                <input
                  type="text"
                  value={openRegisterName}
                  onChange={(e) => setOpenRegisterName(e.target.value)}
                  placeholder="e.g. Register 1 / POS Front Desk"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-semibold focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Starting Cash Float (IDR):
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={openFloatAmount}
                  onChange={(e) => setOpenFloatAmount(e.target.value)}
                  placeholder="e.g. 200000"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-mono font-bold text-blue-700 focus:border-blue-500 focus:outline-none"
                  required
                />

                {/* Preset Chips */}
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {FLOAT_PRESETS.map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setOpenFloatAmount(String(amt))}
                      className="px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-[11px] font-mono font-semibold text-gray-700 transition-colors"
                    >
                      IDR {amt.toLocaleString("id-ID")}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Shift Notes (Optional):
                </label>
                <input
                  type="text"
                  value={openNotes}
                  onChange={(e) => setOpenNotes(e.target.value)}
                  placeholder="e.g. Morning Shift - Walk-in promos"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors disabled:opacity-50"
                >
                  {loading ? "Opening Shift..." : "Open Register Shift"}
                </button>
              </div>
            </form>
          )}

          {/* VIEW: STATUS (Active Shift Live Dashboard) */}
          {view === "STATUS" && currentShift && (
            <div className="space-y-4">
              {/* Drawer Live Stats */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-gray-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-500">
                    Opening Float
                  </span>
                  <p className="text-sm font-bold font-mono text-gray-900 mt-0.5">
                    IDR{" "}
                    {parseFloat(
                      currentShift.openingBalance || "0",
                    ).toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="p-3 bg-emerald-50/70 rounded-xl border border-emerald-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">
                    Cash Sales
                  </span>
                  <p className="text-sm font-bold font-mono text-emerald-800 mt-0.5">
                    +IDR{" "}
                    {parseFloat(
                      currentShift.totalCashSales || "0",
                    ).toLocaleString("id-ID")}
                  </p>
                </div>

                <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-700">
                    Expected In Drawer
                  </span>
                  <p className="text-sm font-extrabold font-mono text-blue-900 mt-0.5">
                    IDR {expectedCashNum.toLocaleString("id-ID")}
                  </p>
                </div>
              </div>

              {/* Cash Movements Summary */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 text-xs space-y-2">
                <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                  <span className="font-bold text-gray-700">
                    Mid-Shift Drawer Adjustments
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setMovementType("CASH_IN");
                      setMovementAmount("");
                      setMovementReason("");
                      setView("CASH_MOVEMENT");
                    }}
                    className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800"
                  >
                    + Add Cash In / Out
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Cash In:</span>
                    <span className="font-mono font-bold text-emerald-700">
                      +IDR{" "}
                      {parseFloat(
                        currentShift.totalCashIn || "0",
                      ).toLocaleString("id-ID")}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Total Cash Out:</span>
                    <span className="font-mono font-bold text-rose-700">
                      -IDR{" "}
                      {parseFloat(
                        currentShift.totalCashOut || "0",
                      ).toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleViewXReport}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-xs font-bold text-gray-700 transition-colors shadow-2xs"
                >
                  <span>📊</span>
                  <span>View X-Report (Snapshot)</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCountedCash(String(expectedCashNum));
                    setCloseNotes("");
                    setView("CLOSE_FORM");
                  }}
                  className="flex items-center justify-center gap-2 p-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition-colors shadow-md"
                >
                  <span>🔒</span>
                  <span>Close Register Shift (Z-Report)</span>
                </button>
              </div>
            </div>
          )}

          {/* VIEW: CASH_MOVEMENT (Petty Cash In / Out) */}
          {view === "CASH_MOVEMENT" && (
            <form onSubmit={handleRecordMovement} className="space-y-4">
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setMovementType("CASH_IN")}
                  className={`py-2 rounded-xl border transition-colors ${
                    movementType === "CASH_IN"
                      ? "bg-emerald-600 text-white border-emerald-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  + Cash In (Petty Cash Top-up)
                </button>
                <button
                  type="button"
                  onClick={() => setMovementType("CASH_OUT")}
                  className={`py-2 rounded-xl border transition-colors ${
                    movementType === "CASH_OUT"
                      ? "bg-rose-600 text-white border-rose-600"
                      : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  - Cash Out (Safe Drop / Expense)
                </button>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Amount (IDR):
                </label>
                <input
                  type="number"
                  min="1"
                  step="1000"
                  value={movementAmount}
                  onChange={(e) => setMovementAmount(e.target.value)}
                  placeholder="e.g. 50000"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-mono font-bold focus:border-blue-500 focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Reason / Description:
                </label>
                <input
                  type="text"
                  value={movementReason}
                  onChange={(e) => setMovementReason(e.target.value)}
                  placeholder="e.g. Added change float / Paid for store supplies / Drop to safe"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                  required
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setView("STATUS")}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors disabled:opacity-50"
                >
                  {loading ? "Recording..." : "Save Drawer Adjustment"}
                </button>
              </div>
            </form>
          )}

          {/* VIEW: CLOSE_FORM (Physical Cash Reconciliation) */}
          {view === "CLOSE_FORM" && currentShift && (
            <form onSubmit={handleCloseShift} className="space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-gray-200 text-xs space-y-1.5">
                <div className="flex justify-between text-gray-600">
                  <span>Opening Cash Float:</span>
                  <span className="font-mono">
                    IDR{" "}
                    {parseFloat(
                      currentShift.openingBalance || "0",
                    ).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Cash Sales Recorded:</span>
                  <span className="font-mono">
                    +IDR{" "}
                    {parseFloat(
                      currentShift.totalCashSales || "0",
                    ).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>Net Cash Movements (In - Out):</span>
                  <span className="font-mono">
                    IDR{" "}
                    {(
                      parseFloat(currentShift.totalCashIn || "0") -
                      parseFloat(currentShift.totalCashOut || "0")
                    ).toLocaleString("id-ID")}
                  </span>
                </div>
                <div className="flex justify-between text-blue-900 font-bold border-t border-gray-200 pt-1.5 text-sm">
                  <span>Expected Cash In Drawer:</span>
                  <span className="font-mono">
                    IDR {expectedCashNum.toLocaleString("id-ID")}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Actual Counted Physical Cash (IDR):
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={countedCash}
                  onChange={(e) => setCountedCash(e.target.value)}
                  placeholder="Enter total physical cash counted in drawer"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-base font-mono font-extrabold text-gray-900 focus:border-blue-500 focus:outline-none"
                  required
                  autoFocus
                />
              </div>

              {/* Variance Indicator */}
              <div
                className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
                  variance === 0
                    ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                    : variance > 0
                      ? "bg-blue-50 border-blue-200 text-blue-800"
                      : "bg-rose-50 border-rose-200 text-rose-800"
                }`}
              >
                <span>
                  {variance === 0
                    ? "✓ Exact Cash Match (No Variance)"
                    : variance > 0
                      ? `🔵 Cash Overage (+IDR ${variance.toLocaleString("id-ID")})`
                      : `🔴 Cash Shortage (-IDR ${Math.abs(variance).toLocaleString("id-ID")})`}
                </span>
                <span className="font-mono font-bold">
                  {variance >= 0 ? "+" : ""}
                  {variance.toLocaleString("id-ID")}
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Closing Notes / Reason for Discrepancy:
                </label>
                <input
                  type="text"
                  value={closeNotes}
                  onChange={(e) => setCloseNotes(e.target.value)}
                  placeholder="e.g. End of evening shift, cash verified with manager"
                  className="w-full rounded-xl border border-gray-300 px-3.5 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setView("STATUS")}
                  className="px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-md transition-colors disabled:opacity-50"
                >
                  {loading ? "Closing Shift..." : "Confirm & Close Shift"}
                </button>
              </div>
            </form>
          )}

          {/* VIEW: REPORT_VIEW (Printable X/Z Report) */}
          {view === "REPORT_VIEW" && reportData && (
            <div className="space-y-4">
              <div className="flex items-center justify-between print:hidden">
                <span className="text-xs font-bold text-gray-700">
                  {reportData.reportType === "Z_REPORT"
                    ? "Final Z-Report (Shift Closed)"
                    : "Mid-Shift X-Report (Live Snapshot)"}
                </span>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-700 shadow-xs"
                >
                  Print Report (80mm)
                </button>
              </div>

              {/* Thermal Printable Sheet */}
              <div className="p-4 bg-slate-100 rounded-xl flex justify-center">
                <div
                  id="shift-report-print"
                  className="w-full max-w-[340px] bg-white p-5 rounded-xl shadow text-slate-900 font-sans text-xs border border-gray-200 print:shadow-none print:border-none print:p-0 print:max-w-none"
                >
                  <div className="text-center pb-2 border-b border-dashed border-gray-300">
                    <h2 className="text-sm font-extrabold text-gray-900">
                      SmartStore
                    </h2>
                    <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider">
                      {reportData.reportType === "Z_REPORT"
                        ? "Z-REPORT (SHIFT CLOSE)"
                        : "X-REPORT (MID-SHIFT)"}
                    </p>
                    <p className="text-[10px] text-gray-500 font-mono">
                      Register: {reportData.shift.registerName}
                    </p>
                  </div>

                  <div className="py-2 text-[11px] font-mono border-b border-dashed border-gray-300 space-y-0.5">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Cashier:</span>
                      <span className="font-semibold">
                        {reportData.shift.cashier?.fullName ?? "-"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Opened:</span>
                      <span>
                        {new Date(reportData.shift.openedAt).toLocaleString(
                          "id-ID",
                        )}
                      </span>
                    </div>
                    {reportData.shift.closedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Closed:</span>
                        <span>
                          {new Date(reportData.shift.closedAt).toLocaleString(
                            "id-ID",
                          )}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Cash Drawer Summary */}
                  <div className="py-2 border-b border-dashed border-gray-300 space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Opening Float:</span>
                      <span>
                        IDR{" "}
                        {parseFloat(
                          reportData.cashSummary.openingBalance,
                        ).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cash Sales:</span>
                      <span className="text-emerald-700">
                        +IDR{" "}
                        {parseFloat(
                          reportData.cashSummary.totalCashSales,
                        ).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cash In (Top-up):</span>
                      <span>
                        +IDR{" "}
                        {parseFloat(
                          reportData.cashSummary.totalCashIn,
                        ).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Cash Out (Drop):</span>
                      <span>
                        -IDR{" "}
                        {parseFloat(
                          reportData.cashSummary.totalCashOut,
                        ).toLocaleString("id-ID")}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold border-t border-dashed border-gray-200 pt-1">
                      <span>Expected Ending Cash:</span>
                      <span>
                        IDR{" "}
                        {parseFloat(
                          reportData.cashSummary.expectedEndingCash,
                        ).toLocaleString("id-ID")}
                      </span>
                    </div>
                    {reportData.cashSummary.actualEndingCash && (
                      <>
                        <div className="flex justify-between font-bold">
                          <span>Actual Cash Counted:</span>
                          <span>
                            IDR{" "}
                            {parseFloat(
                              reportData.cashSummary.actualEndingCash,
                            ).toLocaleString("id-ID")}
                          </span>
                        </div>
                        <div className="flex justify-between font-bold text-blue-800">
                          <span>Cash Difference:</span>
                          <span>
                            IDR{" "}
                            {parseFloat(
                              reportData.cashSummary.cashDifference || "0",
                            ).toLocaleString("id-ID")}
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Payment Methods Breakdown */}
                  <div className="py-2 border-b border-dashed border-gray-300 space-y-1">
                    <p className="font-bold text-[11px] text-gray-700 mb-1">
                      Payment Breakdown:
                    </p>
                    {reportData.paymentBreakdown.map((p, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between text-[11px] font-mono"
                      >
                        <span>
                          {p.method} ({p.count}x):
                        </span>
                        <span>
                          IDR {parseFloat(p.total).toLocaleString("id-ID")}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Sales Volume Summary */}
                  <div className="py-2 space-y-1 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Txns:</span>
                      <span>{reportData.salesSummary.totalTransactions}</span>
                    </div>
                    <div className="flex justify-between font-bold">
                      <span>Gross Sales Total:</span>
                      <span className="text-emerald-700">
                        IDR{" "}
                        {parseFloat(
                          reportData.salesSummary.grossSales,
                        ).toLocaleString("id-ID")}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Print CSS */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #shift-report-print,
          #shift-report-print * {
            visibility: visible !important;
          }
          #shift-report-print {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            max-width: 80mm !important;
            padding: 4mm !important;
            margin: 0 !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            color: black !important;
            font-size: 9pt !important;
          }
          @page {
            margin: 0;
            size: 80mm auto;
          }
        }
      `}</style>
    </div>
  );
}
