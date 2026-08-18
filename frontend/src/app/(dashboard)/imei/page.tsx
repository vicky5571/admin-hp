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

  const handleStatusChange = async (unit: ImeiUnit, status: string) => {
    setError("");
    try {
      await updateImeiStatus(unit.id, { status });
      load(meta.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
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
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Unit</p>
              <p className="font-mono font-medium">
                {lookupResult.unit.imei}
              </p>
              <p className="text-sm text-gray-600 mt-1">
                {lookupResult.unit.product?.name ?? "-"}
              </p>
              <span
                className={`inline-block mt-2 rounded px-1.5 py-0.5 text-xs font-medium ${statusColor[lookupResult.unit.status] ?? "bg-gray-100 text-gray-700"}`}
              >
                {lookupResult.unit.status.replace(/_/g, " ")}
              </span>
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">
                {lookupResult.unit.lastRefType ?? "No reference"}
              </p>
              {lookupResult.sale && (
                <>
                  <p className="font-medium">
                    Invoice: {lookupResult.sale.invoiceNumber}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(lookupResult.sale.saleTime).toLocaleString()}
                  </p>
                </>
              )}
              {lookupResult.goodsReceipt && (
                <>
                  <p className="font-medium">
                    GRN: {lookupResult.goodsReceipt.grnNumber}
                  </p>
                  {lookupResult.goodsReceipt.purchaseOrder && (
                    <p className="text-sm text-gray-500">
                      PO:{" "}
                      {lookupResult.goodsReceipt.purchaseOrder.poNumber}
                    </p>
                  )}
                </>
              )}
              {lookupResult.return && (
                <>
                  <p className="font-medium">
                    Return: {lookupResult.return.returnNumber}
                  </p>
                  <p className="text-sm text-gray-500">
                    {new Date(lookupResult.return.createdAt).toLocaleString()}
                  </p>
                </>
              )}
              {!lookupResult.sale &&
                !lookupResult.goodsReceipt &&
                !lookupResult.return && <p className="text-gray-400">-</p>}
            </div>

            <div className="rounded-lg bg-gray-50 p-4">
              <p className="text-xs text-gray-500 mb-1">Location</p>
              <p className="font-medium">
                {lookupResult.unit.currentLocation}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Added{" "}
                {new Date(lookupResult.unit.createdAt).toLocaleDateString()}
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
              <th className="px-4 py-3 font-medium">Location</th>
              <th className="px-4 py-3 font-medium">Last Ref</th>
              <th className="px-4 py-3 font-medium">Add Date</th>
              <th className="px-4 py-3 font-medium">Set Status</th>
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
            {!loading && units.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-400">
                  No IMEI units
                </td>
              </tr>
            )}
            {units.map((unit) => (
              <tr
                key={unit.id}
                className="border-b border-gray-100 hover:bg-gray-50"
              >
                <td className="px-4 py-3 font-mono">{unit.imei}</td>
                <td className="px-4 py-3">
                  {unit.product
                    ? `${unit.product.sku} — ${unit.product.name}`
                    : unit.productId}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded px-1.5 py-0.5 text-xs font-medium ${statusColor[unit.status] ?? "bg-gray-100 text-gray-700"}`}
                  >
                    {unit.status.replace(/_/g, " ")}
                  </span>
                </td>
                <td className="px-4 py-3">{unit.currentLocation}</td>
                <td className="px-4 py-3">
                  {unit.lastRefType
                    ? `${unit.lastRefType} #${unit.lastRefId}`
                    : "-"}
                </td>
                <td className="px-4 py-3">
                  {new Date(unit.createdAt).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  {unit.status !== "SOLD" ? (
                    <select
                      value={unit.status}
                      onChange={(e) =>
                        handleStatusChange(unit, e.target.value)
                      }
                      className="rounded border border-gray-300 px-2 py-1 text-xs focus:outline-none"
                    >
                      {["IN_STOCK", "RESERVED", "DEFECTIVE"].map((s) => (
                        <option key={s} value={s}>
                          {s.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="text-xs text-gray-400">Locked</span>
                  )}
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
    </div>
  );
}
