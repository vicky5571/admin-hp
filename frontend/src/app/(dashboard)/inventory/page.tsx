"use client";

import { useEffect, useMemo, useState } from "react";
import { fetchStockOnHand } from "@/lib/api";

interface StockItem {
  id: number;
  sku: string;
  name: string;
  product_type: string;
  brand?: string | null;
  on_hand_qty: number;
  reserved_qty: number;
  min_stock_alert: number;
  cost_price: string;
  srp: string;
  stock_value: string;
}

export default function InventoryPage() {
  const [data, setData] = useState<StockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK" | "IN_STOCK">("ALL");
  const [searchTerm, setSearchTerm] = useState("");

  const loadStockData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchStockOnHand();
      setData(res.data?.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, []);

  // Compute Executive KPIs
  const kpis = useMemo(() => {
    const totalSkus = data.length;
    const totalUnitsOnHand = data.reduce((sum, item) => sum + (Number(item.on_hand_qty) || 0), 0);
    const totalUnitsReserved = data.reduce((sum, item) => sum + (Number(item.reserved_qty) || 0), 0);
    const totalCostValuation = data.reduce((sum, item) => sum + (parseFloat(item.stock_value) || 0), 0);
    const totalRetailValuation = data.reduce(
      (sum, item) => sum + (Number(item.on_hand_qty) || 0) * (parseFloat(item.srp) || 0),
      0,
    );

    const outOfStockCount = data.filter((item) => (Number(item.on_hand_qty) || 0) === 0).length;
    const lowStockCount = data.filter(
      (item) =>
        (Number(item.on_hand_qty) || 0) > 0 &&
        (Number(item.on_hand_qty) || 0) <= (Number(item.min_stock_alert) || 0),
    ).length;
    const inStockCount = data.filter(
      (item) => (Number(item.on_hand_qty) || 0) > (Number(item.min_stock_alert) || 0),
    ).length;

    return {
      totalSkus,
      totalUnitsOnHand,
      totalUnitsReserved,
      totalCostValuation,
      totalRetailValuation,
      outOfStockCount,
      lowStockCount,
      inStockCount,
    };
  }, [data]);

  // Filter Data
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      // Status Filter
      const qty = Number(item.on_hand_qty) || 0;
      const minAlert = Number(item.min_stock_alert) || 0;

      if (statusFilter === "OUT_OF_STOCK" && qty !== 0) return false;
      if (statusFilter === "LOW_STOCK" && (qty === 0 || qty > minAlert)) return false;
      if (statusFilter === "IN_STOCK" && qty <= minAlert) return false;

      // Search Term
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const skuMatch = item.sku?.toLowerCase().includes(q);
        const nameMatch = item.name?.toLowerCase().includes(q);
        const brandMatch = item.brand?.toLowerCase().includes(q);
        if (!skuMatch && !nameMatch && !brandMatch) return false;
      }

      return true;
    });
  }, [data, statusFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Inventory & Stock On Hand
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time warehouse stock tracking, valuation, and low stock threshold alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadStockData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors"
          >
            <span>⟳</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* 📊 Executive KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Valuation */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Total Stock Valuation
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-blue-600 text-sm font-bold shadow-2xs">
              💰
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-gray-900 font-mono tracking-tight">
              IDR {kpis.totalCostValuation.toLocaleString("id-ID")}
            </p>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
              <span>Retail Value:</span>
              <span className="font-mono font-semibold text-blue-700">
                IDR {kpis.totalRetailValuation.toLocaleString("id-ID")}
              </span>
            </div>
          </div>
        </div>

        {/* Total Physical Stock */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-gray-500">
              Units On Hand
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-100 text-slate-700 text-sm font-bold shadow-2xs">
              📦
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-gray-900 font-mono tracking-tight">
              {kpis.totalUnitsOnHand.toLocaleString("id-ID")}{" "}
              <span className="text-sm font-semibold text-gray-500 font-sans">units</span>
            </p>
            <div className="flex items-center justify-between text-[11px] text-gray-500 mt-1">
              <span>Across {kpis.totalSkus} SKUs</span>
              {kpis.totalUnitsReserved > 0 && (
                <span className="font-semibold text-amber-700">
                  {kpis.totalUnitsReserved} reserved
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Low Stock Warning */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "LOW_STOCK" ? "ALL" : "LOW_STOCK")}
          className={`rounded-2xl border p-5 shadow-xs text-left transition-all ${
            statusFilter === "LOW_STOCK"
              ? "bg-amber-50/80 border-amber-400 ring-2 ring-amber-400/30"
              : "bg-white border-gray-200 hover:border-amber-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Low Stock Warning
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-100 text-amber-800 text-sm font-bold shadow-2xs">
              ⚠️
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-amber-900 font-mono tracking-tight">
              {kpis.lowStockCount}{" "}
              <span className="text-sm font-semibold text-amber-700 font-sans">SKUs</span>
            </p>
            <p className="text-[11px] text-amber-700 font-medium mt-1">
              {kpis.lowStockCount > 0
                ? "At or below minimum alert threshold"
                : "All stock levels healthy"}
            </p>
          </div>
        </button>

        {/* Out of Stock Alert */}
        <button
          type="button"
          onClick={() => setStatusFilter(statusFilter === "OUT_OF_STOCK" ? "ALL" : "OUT_OF_STOCK")}
          className={`rounded-2xl border p-5 shadow-xs text-left transition-all ${
            statusFilter === "OUT_OF_STOCK"
              ? "bg-rose-50/80 border-rose-400 ring-2 ring-rose-400/30"
              : "bg-white border-gray-200 hover:border-rose-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-800">
              Out of Stock
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-100 text-rose-700 text-sm font-bold shadow-2xs">
              🔴
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-rose-900 font-mono tracking-tight">
              {kpis.outOfStockCount}{" "}
              <span className="text-sm font-semibold text-rose-700 font-sans">SKUs</span>
            </p>
            <p className="text-[11px] text-rose-700 font-medium mt-1">
              {kpis.outOfStockCount > 0
                ? "Items depleted (0 units on hand)"
                : "No depleted items"}
            </p>
          </div>
        </button>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: "ALL", label: `All Items (${kpis.totalSkus})` },
            { id: "LOW_STOCK", label: `⚠️ Low Stock (${kpis.lowStockCount})` },
            { id: "OUT_OF_STOCK", label: `🔴 Out of Stock (${kpis.outOfStockCount})` },
            { id: "IN_STOCK", label: `🟢 Healthy (${kpis.inStockCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shadow-2xs ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-72">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search SKU, name, or brand..."
            className="w-full rounded-xl border border-gray-300 bg-white px-3 py-1.5 pl-8 text-xs font-semibold placeholder:text-gray-400 focus:border-blue-500 focus:outline-none shadow-2xs"
          />
          <span className="absolute left-2.5 top-2 text-gray-400 text-xs">
            🔍
          </span>
          {searchTerm && (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-2.5 top-1.5 text-gray-400 hover:text-gray-600 font-bold text-xs"
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {/* Stock Table */}
      <div className="rounded-2xl bg-white shadow-xs border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-500">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading inventory stock...
          </div>
        ) : error ? (
          <div className="p-8 text-center text-xs text-rose-600 font-medium">
            ⚠️ {error}
          </div>
        ) : filteredData.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500">
            No products matching this filter or search query.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="border-b border-gray-200 bg-slate-50 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Product / SKU</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">On Hand</th>
                  <th className="px-4 py-3 text-right">Reserved</th>
                  <th className="px-4 py-3 text-right">Min Alert</th>
                  <th className="px-4 py-3 text-right">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Retail SRP</th>
                  <th className="px-4 py-3 text-right">Total Stock Value</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {filteredData.map((item) => {
                  const qty = Number(item.on_hand_qty) || 0;
                  const minAlert = Number(item.min_stock_alert) || 0;
                  const isDepleted = qty === 0;
                  const isLow = qty > 0 && qty <= minAlert;

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isDepleted ? "bg-rose-50/40" : isLow ? "bg-amber-50/40" : ""
                      }`}
                    >
                      <td className="px-4 py-3 font-sans">
                        <div className="font-bold text-gray-900 leading-tight">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                          {item.sku} {item.brand ? `• ${item.brand}` : ""}
                        </div>
                      </td>

                      <td className="px-4 py-3 font-sans">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            item.product_type === "SERIALIZED"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {item.product_type === "SERIALIZED" ? "📱 IMEI" : "Standard"}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-sm">
                        <span
                          className={`${
                            isDepleted
                              ? "text-rose-600"
                              : isLow
                                ? "text-amber-700"
                                : "text-gray-900"
                          }`}
                        >
                          {qty.toLocaleString("id-ID")}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-right text-gray-500">
                        {item.reserved_qty > 0 ? (
                          <span className="font-semibold text-amber-700">
                            {item.reserved_qty}
                          </span>
                        ) : (
                          "0"
                        )}
                      </td>

                      <td className="px-4 py-3 text-right text-gray-400">
                        {item.min_stock_alert}
                      </td>

                      <td className="px-4 py-3 text-right text-gray-600">
                        IDR {parseFloat(item.cost_price || "0").toLocaleString("id-ID")}
                      </td>

                      <td className="px-4 py-3 text-right text-blue-700 font-semibold">
                        IDR {parseFloat(item.srp || "0").toLocaleString("id-ID")}
                      </td>

                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        IDR {parseFloat(item.stock_value || "0").toLocaleString("id-ID")}
                      </td>

                      <td className="px-4 py-3 text-center font-sans">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isDepleted
                              ? "bg-rose-100 text-rose-800"
                              : isLow
                                ? "bg-amber-100 text-amber-800"
                                : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isDepleted
                            ? "🔴 Out of Stock"
                            : isLow
                              ? "⚠️ Low Stock"
                              : "🟢 Healthy"}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}