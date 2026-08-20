"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ImeiUnit,
  fetchImeiUnits,
  lookupImei,
  updateImeiStatus,
} from "@/lib/api";

const IMEI_STATUSES = [
  "IN_STOCK",
  "SOLD",
  "RETURNED",
  "DEFECTIVE",
  "RESERVED",
];

const statusColor: Record<string, string> = {
  IN_STOCK: "bg-green-100 text-green-700",
  SOLD: "bg-blue-100 text-blue-700",
  RETURNED: "bg-amber-100 text-amber-700",
  DEFECTIVE: "bg-red-100 text-red-600",
  RESERVED: "bg-purple-100 text-purple-700",
};

interface LookupResult {
  unit: ImeiUnit;
  sale: { id: number; invoiceNumber: string; saleTime: string } | null;
  return: { id: number; returnNumber: string; createdAt: string } | null;
  goodsReceipt: {
    id: number;
    grnNumber: string;
    purchaseOrder?: { poNumber: string };
  } | null;
}

export default function ImeiPage() {
  const [units, setUnits] = useState<ImeiUnit[]>([]);
  const [meta, setMeta] = useState<{ page: number; pageCount: number }>({
    page: 1,
    pageCount: 1,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [lookupValue, setLookupValue] = useState("");
  const [lookupResult, setLookupResult] = useState<LookupResult | null>(null);
  const [lookupError, setLookupError] = useState("");

  // Edit Unit Modal
  const [editingUnit, setEditingUnit] = useState<ImeiUnit | null>(null);
  const [editStatus, setEditStatus] = useState<string>("IN_STOCK");
  const [editLocation, setEditLocation] = useState<string>("STORE");
  const [editConditionGrade, setEditConditionGrade] = useState<string>("");
  const [editBatteryHealth, setEditBatteryHealth] = useState<string>("");
  const [editSaving, setEditSaving] = useState<boolean>(false);
  const [editError, setEditError] = useState<string>("");

  const load = useCallback(
    async (page = 1) => {
      setLoading(true);
      try {
        const res = await fetchImeiUnits({
          q: search || undefined,
          status: statusFilter || undefined,
          page,
          limit: 20,
        });
        setUnits(res.data ?? []);
        setMeta(((res.meta ?? {}) as any) ?? { page: 1, pageCount: 1 });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load IMEIs");
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter],
  );

  useEffect(() => {
    load(1);
  }, [load]);

  const handleLookup = async () => {
    const value = lookupValue.trim();
    if (!value) return;
    setLookupError("");
    setLookupResult(null);
    try {
      const res = await lookupImei(value);
      setLookupResult(res.data);
    } catch (err) {
      setLookupError(err instanceof Error ? err.message : "Lookup failed");
    }
  };

  const handleOpenEdit = (unit: ImeiUnit) => {
    setEditingUnit(unit);
    setEditStatus(unit.status);
    setEditLocation(unit.currentLocation || "STORE");
    setEditConditionGrade(unit.conditionGrade || "");
    setEditBatteryHealth(unit.batteryHealth != null ? String(unit.batteryHealth) : "");
    setEditError("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    setEditSaving(true);
    setEditError("");
    try {
      await updateImeiStatus(editingUnit.id, {
        status: editingUnit.status !== "SOLD" ? editStatus : undefined,
        location: editLocation.trim() || undefined,
        conditionGrade: editConditionGrade.trim() || undefined,
        batteryHealth: editBatteryHealth.trim() ? parseInt(editBatteryHealth.trim(), 10) : null,
      });
      setEditingUnit(null);
      load(meta.page);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update unit");
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4 sm:mb-6">IMEI Tracking</h1>

      <div className="mb-4 sm:mb-6 rounded-xl bg-white p-4 sm:p-5 shadow-sm border border-gray-200">
        <h2 className="font-semibold text-gray-900 mb-2 sm:mb-3">IMEI Lookup</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={lookupValue}
            onChange={(e) => setLookupValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleLookup();
            }}
            placeholder="Enter IMEI number..."
            className="flex-1 max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
          />
          <button
            onClick={handleLookup}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Lookup
          </button>
        </div>

        {lookupError && (
          <p className="mt-2 text-sm text-red-600">{lookupError}</p>
        )}

        {lookupResult && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Unit</p>
              <p className="font-mono font-bold text-gray-900">
                {lookupResult.unit.imei}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {lookupResult.unit.product?.name ?? "-"}
              </p>
              <span
                className={`inline-block mt-2 rounded px-2 py-0.5 text-xs font-semibold ${statusColor[lookupResult.unit.status] ?? "bg-gray-100 text-gray-700"}`}
              >
                {lookupResult.unit.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Condition & Battery</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                  {lookupResult.unit.conditionGrade ? lookupResult.unit.conditionGrade : "—"}
                </span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {lookupResult.unit.batteryHealth != null ? `${lookupResult.unit.batteryHealth}% BH` : "—"}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-2">
                Physical grade and battery health state
              </p>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">
                {lookupResult.unit.lastRefType ?? "No reference"}
              </p>
              {lookupResult.sale && (
                <>
                  <p className="font-medium text-xs">
                    Invoice: {lookupResult.sale.invoiceNumber}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {new Date(lookupResult.sale.saleTime).toLocaleString()}
                  </p>
                </>
              )}
              {lookupResult.goodsReceipt && (
                <>
                  <p className="font-medium text-xs">
                    GRN: {lookupResult.goodsReceipt.grnNumber}
                  </p>
                  {lookupResult.goodsReceipt.purchaseOrder && (
                    <p className="text-[11px] text-gray-500">
                      PO: {lookupResult.goodsReceipt.purchaseOrder.poNumber}
                    </p>
                  )}
                </>
              )}
              {lookupResult.return && (
                <>
                  <p className="font-medium text-xs">
                    Return: {lookupResult.return.returnNumber}
                  </p>
                  <p className="text-[11px] text-gray-500">
                    {new Date(lookupResult.return.createdAt).toLocaleString()}
                  </p>
                </>
              )}
              {!lookupResult.sale &&
                !lookupResult.goodsReceipt &&
                !lookupResult.return && <p className="text-gray-400 text-xs">—</p>}
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Location</p>
              <p className="font-medium text-xs">
                {lookupResult.unit.currentLocation}
              </p>
              <p className="text-[11px] text-gray-500 mt-2">
                Added {new Date(lookupResult.unit.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      <div className="mb-3 sm:mb-4 flex flex-wrap items-center gap-2 sm:gap-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by IMEI number..."
          className="w-64 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
        >
          <option value="">All statuses</option>
          {IMEI_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
                <th className="px-4 py-3 font-medium">IMEI</th>
                <th className="px-4 py-3 font-medium">Product</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Condition</th>
                <th className="px-4 py-3 font-medium text-center">Battery</th>
                <th className="px-4 py-3 font-medium">Location</th>
                <th className="px-4 py-3 font-medium">Last Ref</th>
                <th className="px-4 py-3 font-medium">Add Date</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    Loading IMEI records...
                  </td>
                </tr>
              )}
              {!loading && units.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-400">
                    No IMEI units found matching criteria
                  </td>
                </tr>
              )}
              {units.map((unit) => (
                <tr
                  key={unit.id}
                  className="border-b border-gray-100 hover:bg-gray-50/80 transition-colors"
                >
                  <td className="px-4 py-3 font-mono font-bold text-gray-900 text-xs">
                    {unit.imei}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {unit.product
                      ? `${unit.product.sku} — ${unit.product.name}`
                      : unit.productId}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-1.5 py-0.5 text-xs font-semibold ${statusColor[unit.status] ?? "bg-gray-100 text-gray-700"}`}
                    >
                      {unit.status.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {unit.conditionGrade ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                        {unit.conditionGrade}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-center font-mono">
                    {unit.batteryHealth != null ? (
                      <span
                        className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-bold ${
                          unit.batteryHealth >= 90
                            ? "bg-emerald-50 text-emerald-700"
                            : unit.batteryHealth >= 80
                            ? "bg-amber-50 text-amber-700"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {unit.batteryHealth}%
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">{unit.currentLocation}</td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {unit.lastRefType
                      ? `${unit.lastRefType} #${unit.lastRefId}`
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {new Date(unit.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(unit)}
                      className="rounded-lg bg-gray-100 hover:bg-blue-50 hover:text-blue-700 px-2.5 py-1 text-xs font-semibold text-gray-700 transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {meta.pageCount > 1 && (
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            onClick={() => load(meta.page - 1)}
            disabled={meta.page <= 1}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Prev
          </button>
          <span className="text-sm text-gray-500">
            Page {meta.page} of {meta.pageCount}
          </span>
          <button
            onClick={() => load(meta.page + 1)}
            disabled={meta.page >= meta.pageCount}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Edit IMEI Unit Modal */}
      {editingUnit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Edit IMEI Unit
                </h3>
                <p className="text-xs font-mono text-gray-500">
                  {editingUnit.imei} &bull; {editingUnit.product?.name ?? ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingUnit(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            {editError && (
              <div className="mb-3 rounded-lg bg-red-50 p-2.5 text-xs text-red-600 border border-red-200">
                {editError}
              </div>
            )}

            <form onSubmit={handleSaveEdit} className="space-y-3.5 text-xs">
              {/* Status */}
              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Unit Status
                </label>
                {editingUnit.status === "SOLD" ? (
                  <input
                    type="text"
                    disabled
                    value="SOLD (Locked — Process return to restock)"
                    className="w-full rounded-lg border border-gray-300 bg-gray-100 px-3 py-2 text-xs text-gray-500 font-medium cursor-not-allowed"
                  />
                ) : (
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs bg-white focus:border-blue-500 focus:outline-none"
                  >
                    <option value="IN_STOCK">IN STOCK</option>
                    <option value="RESERVED">RESERVED</option>
                    <option value="DEFECTIVE">DEFECTIVE</option>
                  </select>
                )}
              </div>

              {/* Location */}
              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Storage Location
                </label>
                <input
                  type="text"
                  placeholder="e.g. STORE, DISPLAY, WAREHOUSE"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Condition Grade (Optional) */}
              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Condition Grade <span className="text-gray-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Brand New, Grade A, Grade B, Like New"
                  value={editConditionGrade}
                  onChange={(e) => setEditConditionGrade(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs focus:border-blue-500 focus:outline-none"
                />
              </div>

              {/* Battery Health (Optional) */}
              <div>
                <label className="block font-semibold text-gray-700 uppercase mb-1">
                  Battery Health (%) <span className="text-gray-400 font-normal lowercase">(optional)</span>
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  placeholder="e.g. 100 or 88"
                  value={editBatteryHealth}
                  onChange={(e) => setEditBatteryHealth(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="px-3.5 py-2 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSaving}
                  className="px-4 py-2 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                >
                  {editSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
