"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  fetchImeiUnits,
  ImeiUnit,
  Product,
  updateImeiStatus,
} from "@/lib/api";

interface ProductImeisModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: { id: number; name: string; sku: string; on_hand_qty: number } | null;
  onUnitUpdated?: () => void;
}

export default function ProductImeisModal({
  isOpen,
  onClose,
  product,
  onUnitUpdated,
}: ProductImeisModalProps) {
  const [units, setUnits] = useState<ImeiUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [copiedImei, setCopiedImei] = useState<string | null>(null);

  // Edit Unit State
  const [editingUnit, setEditingUnit] = useState<ImeiUnit | null>(null);
  const [editStatus, setEditStatus] = useState<string>("IN_STOCK");
  const [editLocation, setEditLocation] = useState<string>("STORE");
  const [editGrade, setEditGrade] = useState<string>("");
  const [editBattery, setEditBattery] = useState<string>("");
  const [editCostPrice, setEditCostPrice] = useState<string>("");
  const [editSellingPrice, setEditSellingPrice] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  const loadUnits = async () => {
    if (!product) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetchImeiUnits({ productId: product.id, limit: 100 });
      setUnits(res.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load IMEI units");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && product) {
      setSearch("");
      setEditingUnit(null);
      loadUnits();
    }
  }, [isOpen, product]);

  const filteredUnits = useMemo(() => {
    if (!search.trim()) return units;
    const q = search.toLowerCase().trim();
    return units.filter(
      (u) =>
        u.imei.toLowerCase().includes(q) ||
        (u.currentLocation && u.currentLocation.toLowerCase().includes(q)) ||
        (u.conditionGrade && u.conditionGrade.toLowerCase().includes(q)),
    );
  }, [units, search]);

  if (!isOpen || !product) return null;

  const handleCopyImei = (imei: string) => {
    navigator.clipboard.writeText(imei);
    setCopiedImei(imei);
    setTimeout(() => setCopiedImei(null), 2000);
  };

  const handleStartEdit = (unit: ImeiUnit) => {
    setEditingUnit(unit);
    setEditStatus(unit.status);
    setEditLocation(unit.currentLocation || "STORE");
    setEditGrade(unit.conditionGrade || "NEW");
    setEditBattery(unit.batteryHealth ? String(unit.batteryHealth) : "100");
    setEditCostPrice(unit.costPrice ? String(parseFloat(unit.costPrice)) : "");
    setEditSellingPrice(
      unit.sellingPrice ? String(parseFloat(unit.sellingPrice)) : "",
    );
    setEditError("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;
    setSaving(true);
    setEditError("");

    try {
      await updateImeiStatus(editingUnit.id, {
        status: editStatus,
        location: editLocation.trim() || undefined,
        conditionGrade: editGrade.trim() || undefined,
        batteryHealth: editBattery ? parseInt(editBattery, 10) : null,
        costPrice: editCostPrice ? parseFloat(editCostPrice) : null,
        sellingPrice: editSellingPrice ? parseFloat(editSellingPrice) : null,
      });

      setEditingUnit(null);
      await loadUnits();
      if (onUnitUpdated) onUnitUpdated();
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update unit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-200 space-y-4 max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-100 text-purple-700 text-xs font-bold">
                📱
              </span>
              <h3 className="text-base font-bold text-gray-900 leading-tight">
                {product.name}
              </h3>
            </div>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              SKU: {product.sku} &bull; Physical On Hand:{" "}
              <strong className="text-gray-900">{product.on_hand_qty} units</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-xl"
          >
            &times;
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Search Bar & Summary */}
        <div className="flex items-center justify-between gap-3">
          <div className="relative flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search IMEI number, location, or grade..."
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 pl-8 text-xs font-mono font-semibold placeholder:font-sans placeholder:text-gray-400 focus:border-purple-500 focus:outline-none shadow-2xs"
            />
            <span className="absolute left-2.5 top-2 text-gray-400 text-xs">
              🔍
            </span>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2.5 top-1.5 text-gray-400 hover:text-gray-600 font-bold text-xs"
              >
                &times;
              </button>
            )}
          </div>

          <span className="text-xs font-bold text-gray-600 bg-slate-100 px-3 py-2 rounded-xl shrink-0 font-mono">
            {filteredUnits.length} Units Tracked
          </span>
        </div>

        {/* Units List */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          {loading ? (
            <div className="p-12 text-center text-xs text-gray-400">
              <div className="w-6 h-6 border-2 border-purple-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              Loading physical IMEI units...
            </div>
          ) : filteredUnits.length === 0 ? (
            <div className="p-12 text-center text-xs text-gray-400">
              {search
                ? "No IMEI units match your search query."
                : "No active serialized IMEI units found for this product."}
            </div>
          ) : (
            filteredUnits.map((u) => {
              const isAvailable = u.status === "IN_STOCK";
              const isSold = u.status === "SOLD";
              const isDefective = u.status === "DEFECTIVE";
              const isReserved = u.status === "RESERVED";

              const costNum = u.costPrice ? parseFloat(u.costPrice) : null;
              const srpNum = u.sellingPrice ? parseFloat(u.sellingPrice) : null;

              return (
                <div
                  key={u.id}
                  className="p-3.5 hover:bg-slate-50/70 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-black text-gray-900 text-sm tracking-wide">
                        {u.imei}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopyImei(u.imei)}
                        className="text-[10px] text-gray-400 hover:text-purple-600 font-sans font-bold px-1.5 py-0.5 rounded bg-gray-100 hover:bg-purple-50"
                        title="Copy IMEI to clipboard"
                      >
                        {copiedImei === u.imei ? "✓ Copied" : "📋 Copy"}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 font-sans">
                      <span className="inline-flex items-center gap-1 font-semibold text-gray-700 bg-slate-100 px-2 py-0.5 rounded-md">
                        📍 {u.currentLocation || "STORE"}
                      </span>

                      {u.conditionGrade && (
                        <span className="inline-flex items-center font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                          ✨ {u.conditionGrade}
                        </span>
                      )}

                      {u.batteryHealth !== null && u.batteryHealth !== undefined && (
                        <span
                          className={`inline-flex items-center font-bold px-2 py-0.5 rounded-md ${
                            u.batteryHealth >= 85
                              ? "text-emerald-700 bg-emerald-50"
                              : "text-amber-800 bg-amber-50"
                          }`}
                        >
                          🔋 {u.batteryHealth}%
                        </span>
                      )}

                      {/* Unit Pricing Badges */}
                      {costNum !== null && (
                        <span className="inline-flex items-center font-mono text-[11px] text-gray-600 bg-gray-100 px-2 py-0.5 rounded-md">
                          Modal: IDR {costNum.toLocaleString("id-ID")}
                        </span>
                      )}

                      {srpNum !== null ? (
                        <span className="inline-flex items-center font-mono font-bold text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          Jual: IDR {srpNum.toLocaleString("id-ID")}
                        </span>
                      ) : (
                        <span className="inline-flex items-center font-sans text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded-md">
                          ⚠️ No SRP Set
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 font-sans shrink-0">
                    {/* Status Badge */}
                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        isAvailable
                          ? "bg-emerald-100 text-emerald-800"
                          : isReserved
                            ? "bg-amber-100 text-amber-800"
                            : isDefective
                              ? "bg-rose-100 text-rose-800"
                              : isSold
                                ? "bg-gray-200 text-gray-700"
                                : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {isAvailable
                        ? "🟢 In Stock"
                        : isReserved
                          ? "🟡 Reserved"
                          : isDefective
                            ? "🔴 Defective"
                            : isSold
                              ? "⚪ Sold"
                              : u.status}
                    </span>

                    {/* Edit Unit Button */}
                    <button
                      type="button"
                      onClick={() => handleStartEdit(u)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-gray-700 hover:text-purple-700 bg-gray-100 hover:bg-purple-50 border border-gray-200 transition-colors"
                      title="Edit pricing, location, grade, or battery health"
                    >
                      ✏️ Edit
                    </button>

                    {/* Trace Link */}
                    <Link
                      href={`/imei?q=${encodeURIComponent(u.imei)}`}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-bold text-purple-700 hover:bg-purple-100 bg-purple-50 border border-purple-200 transition-colors"
                      title="View full lifecycle history in IMEI audit page"
                    >
                      Lifecycle ↗
                    </Link>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Inline Edit Unit Drawer */}
        {editingUnit && (
          <form
            onSubmit={handleSaveEdit}
            className="p-4 rounded-xl bg-purple-50/70 border border-purple-200 space-y-3 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-purple-900">
                Update Device Unit ({editingUnit.imei})
              </span>
              <button
                type="button"
                onClick={() => setEditingUnit(null)}
                className="text-purple-700 hover:text-purple-900 font-bold"
              >
                &times; Cancel
              </button>
            </div>

            {editError && (
              <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                ⚠️ {editError}
              </div>
            )}

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold uppercase text-purple-900 mb-1">
                  Status:
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full rounded-lg border border-purple-300 bg-white p-1.5 text-xs font-bold text-gray-900 focus:outline-none"
                >
                  <option value="IN_STOCK">🟢 IN_STOCK</option>
                  <option value="RESERVED">🟡 RESERVED</option>
                  <option value="DEFECTIVE">🔴 DEFECTIVE</option>
                  <option value="SOLD">⚪ SOLD</option>
                  <option value="RETURNED">RETURNED</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-purple-900 mb-1">
                  Location:
                </label>
                <select
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="w-full rounded-lg border border-purple-300 bg-white p-1.5 text-xs font-bold text-gray-900 focus:outline-none"
                >
                  <option value="STORE">🏪 Store Front</option>
                  <option value="WAREHOUSE">🏢 Warehouse</option>
                  <option value="DISPLAY">🪟 Display Showcase</option>
                  <option value="SERVICE_CENTER">🛠️ Service Center</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-purple-900 mb-1">
                  Grade:
                </label>
                <select
                  value={editGrade}
                  onChange={(e) => setEditGrade(e.target.value)}
                  className="w-full rounded-lg border border-purple-300 bg-white p-1.5 text-xs font-bold text-gray-900 focus:outline-none"
                >
                  <option value="NEW">✨ Brand New (Sealed)</option>
                  <option value="LIKE_NEW">Like New (Open Box)</option>
                  <option value="GRADE_A">Grade A (Excellent)</option>
                  <option value="GRADE_B">Grade B (Good)</option>
                  <option value="GRADE_C">Grade C (Fair)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-purple-900 mb-1">
                  Battery (%):
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={editBattery}
                  onChange={(e) => setEditBattery(e.target.value)}
                  placeholder="e.g. 100"
                  className="w-full rounded-lg border border-purple-300 bg-white p-1.5 text-xs font-mono font-bold text-gray-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-purple-900 mb-1">
                  Cost (Modal IDR):
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={editCostPrice}
                  onChange={(e) => setEditCostPrice(e.target.value)}
                  placeholder="e.g. 7000000"
                  className="w-full rounded-lg border border-purple-300 bg-white p-1.5 text-xs font-mono font-bold text-gray-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase text-purple-900 mb-1">
                  Selling Price (SRP):
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={editSellingPrice}
                  onChange={(e) => setEditSellingPrice(e.target.value)}
                  placeholder="e.g. 8500000"
                  className="w-full rounded-lg border border-purple-300 bg-white p-1.5 text-xs font-mono font-bold text-blue-700 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setEditingUnit(null)}
                className="px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-white rounded-lg"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-4 py-1.5 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-xs disabled:opacity-50"
              >
                {saving ? "Saving..." : "Save Unit Changes"}
              </button>
            </div>
          </form>
        )}

        {/* Footer */}
        <div className="flex justify-between items-center pt-2 border-t border-gray-100">
          <Link
            href="/imei"
            className="text-xs font-bold text-purple-700 hover:underline"
          >
            Go to Global IMEI Tracking Page &rarr;
          </Link>

          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
