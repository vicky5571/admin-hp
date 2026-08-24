"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Brand,
  Category,
  fetchBrands,
  fetchCategories,
  fetchStockOnHand,
  lookupImei,
  Product,
} from "@/lib/api";
import CameraBarcodeScanner from "@/components/CameraBarcodeScanner";
import StockAdjustmentModal from "./components/StockAdjustmentModal";
import StockAdjustmentsHistoryModal from "./components/StockAdjustmentsHistoryModal";
import ProductImeisModal from "./components/ProductImeisModal";

interface StockItem {
  id: number;
  sku: string;
  name: string;
  product_type: string;
  category_id?: number | null;
  brand_id?: number | null;
  brand?: string | null;
  category?: string | null;
  on_hand_qty: number;
  reserved_qty: number;
  min_stock_alert: number;
  cost_price: string;
  srp: string;
  stock_value: string;
}

type StatusFilter = "ALL" | "LOW_STOCK" | "OUT_OF_STOCK" | "IN_STOCK";
type ProductTypeFilter = "ALL" | "SERIALIZED" | "NON_SERIALIZED";
type SortOption =
  | "QTY_ASC"
  | "QTY_DESC"
  | "VALUE_DESC"
  | "NAME_ASC"
  | "NAME_DESC"
  | "SKU_ASC";

export default function InventoryPage() {
  const [data, setData] = useState<StockItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Filters State
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ALL");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [productTypeFilter, setProductTypeFilter] = useState<ProductTypeFilter>("ALL");
  const [sortBy, setSortBy] = useState<SortOption>("QTY_ASC");

  // Adjustment & IMEI Modals State
  const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [adjustTargetProductId, setAdjustTargetProductId] = useState<number | null>(null);
  const [adjustTargetOnHand, setAdjustTargetOnHand] = useState<number | undefined>(undefined);

  const [selectedImeiProduct, setSelectedImeiProduct] = useState<{
    id: number;
    name: string;
    sku: string;
    on_hand_qty: number;
  } | null>(null);

  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const loadStockData = async () => {
    setLoading(true);
    setError("");
    try {
      const [stockRes, catRes, brandRes] = await Promise.all([
        fetchStockOnHand(),
        fetchCategories().catch(() => ({ success: true, data: [] })),
        fetchBrands().catch(() => ({ success: true, data: [] })),
      ]);
      setData(stockRes.data?.data ?? []);
      setCategories(catRes.data ?? []);
      setBrands(brandRes.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load inventory");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStockData();
  }, []);

  // Compute Executive Overall KPIs
  const kpis = useMemo(() => {
    const totalSkus = data.length;
    const totalUnitsOnHand = data.reduce(
      (sum, item) => sum + (Number(item.on_hand_qty) || 0),
      0,
    );
    const totalUnitsReserved = data.reduce(
      (sum, item) => sum + (Number(item.reserved_qty) || 0),
      0,
    );
    const totalCostValuation = data.reduce(
      (sum, item) => sum + (parseFloat(item.stock_value) || 0),
      0,
    );
    const totalRetailValuation = data.reduce(
      (sum, item) =>
        sum + (Number(item.on_hand_qty) || 0) * (parseFloat(item.srp) || 0),
      0,
    );

    const outOfStockCount = data.filter(
      (item) => (Number(item.on_hand_qty) || 0) === 0,
    ).length;
    const lowStockCount = data.filter(
      (item) =>
        (Number(item.on_hand_qty) || 0) > 0 &&
        (Number(item.on_hand_qty) || 0) <= (Number(item.min_stock_alert) || 0),
    ).length;
    const inStockCount = data.filter(
      (item) =>
        (Number(item.on_hand_qty) || 0) > (Number(item.min_stock_alert) || 0),
    ).length;

    const serializedSkus = data.filter((item) => item.product_type === "SERIALIZED");
    const serializedUnits = serializedSkus.reduce(
      (sum, item) => sum + (Number(item.on_hand_qty) || 0),
      0,
    );

    return {
      totalSkus,
      totalUnitsOnHand,
      totalUnitsReserved,
      totalCostValuation,
      totalRetailValuation,
      outOfStockCount,
      lowStockCount,
      inStockCount,
      serializedSkusCount: serializedSkus.length,
      serializedUnitsCount: serializedUnits,
    };
  }, [data]);

  // Map StockItems to Products for Modal Selector
  const modalProducts: Product[] = useMemo(() => {
    return data.map((d) => ({
      id: d.id,
      sku: d.sku,
      name: d.name,
      productType: d.product_type,
      costPrice: d.cost_price,
      srp: d.srp,
      minStockAlert: d.min_stock_alert,
      isActive: true,
      categoryId: d.category_id,
      brandId: d.brand_id,
    }));
  }, [data]);

  // Handle Barcode / Phone Camera Scan
  const handleBarcodeScanned = async (scannedCode: string) => {
    const clean = scannedCode.trim();
    if (!clean) return;

    // 1. Direct SKU match in inventory
    const matched = data.find(
      (item) => item.sku.toLowerCase() === clean.toLowerCase(),
    );

    if (matched) {
      setSearchTerm(matched.sku);
      setSuccessMsg(`Found product: ${matched.name}`);
      if (matched.product_type === "SERIALIZED") {
        setSelectedImeiProduct(matched);
      }
      setTimeout(() => setSuccessMsg(""), 3000);
      return;
    }

    // 2. Remote IMEI Lookup
    try {
      const imeiRes = await lookupImei(clean);
      const unit = imeiRes.data?.unit;
      if (unit && unit.product) {
        const prod = data.find((d) => d.id === unit.productId) || {
          id: unit.product.id,
          name: unit.product.name,
          sku: unit.product.sku,
          on_hand_qty: 1,
        };
        setSearchTerm(unit.product.sku);
        setSelectedImeiProduct(prod as any);
        setSuccessMsg(
          `Identified Serialized Phone: ${unit.product.name} (IMEI: ${unit.imei})`,
        );
        setTimeout(() => setSuccessMsg(""), 3500);
      } else {
        setError(`Barcode / IMEI "${clean}" not recognized.`);
      }
    } catch {
      setError(`Barcode "${clean}" not found in system.`);
    }
  };

  // Filter & Sort Data
  const filteredAndSortedData = useMemo(() => {
    const filtered = data.filter((item) => {
      const qty = Number(item.on_hand_qty) || 0;
      const minAlert = Number(item.min_stock_alert) || 0;

      // 1. Status Filter
      if (statusFilter === "OUT_OF_STOCK" && qty !== 0) return false;
      if (statusFilter === "LOW_STOCK" && (qty === 0 || qty > minAlert))
        return false;
      if (statusFilter === "IN_STOCK" && qty <= minAlert) return false;

      // 2. Category Filter
      if (selectedCategory !== "ALL") {
        if (
          String(item.category_id) !== selectedCategory &&
          item.category !== selectedCategory
        ) {
          return false;
        }
      }

      // 3. Brand Filter
      if (selectedBrand !== "ALL") {
        if (
          String(item.brand_id) !== selectedBrand &&
          item.brand !== selectedBrand
        ) {
          return false;
        }
      }

      // 4. Product Type Filter
      if (
        productTypeFilter !== "ALL" &&
        item.product_type !== productTypeFilter
      ) {
        return false;
      }

      // 5. Search Term (SKU, Name, Brand, Category)
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim();
        const skuMatch = item.sku?.toLowerCase().includes(q);
        const nameMatch = item.name?.toLowerCase().includes(q);
        const brandMatch = item.brand?.toLowerCase().includes(q);
        const catMatch = item.category?.toLowerCase().includes(q);
        if (!skuMatch && !nameMatch && !brandMatch && !catMatch) return false;
      }

      return true;
    });

    // Sort
    return filtered.sort((a, b) => {
      const qtyA = Number(a.on_hand_qty) || 0;
      const qtyB = Number(b.on_hand_qty) || 0;
      const valA = parseFloat(a.stock_value) || 0;
      const valB = parseFloat(b.stock_value) || 0;

      switch (sortBy) {
        case "QTY_ASC":
          return qtyA - qtyB;
        case "QTY_DESC":
          return qtyB - qtyA;
        case "VALUE_DESC":
          return valB - valA;
        case "NAME_ASC":
          return a.name.localeCompare(b.name);
        case "NAME_DESC":
          return b.name.localeCompare(a.name);
        case "SKU_ASC":
          return a.sku.localeCompare(b.sku);
        default:
          return 0;
      }
    });
  }, [
    data,
    statusFilter,
    selectedCategory,
    selectedBrand,
    productTypeFilter,
    searchTerm,
    sortBy,
  ]);

  // Filtered Summary KPIs
  const filteredSummary = useMemo(() => {
    const count = filteredAndSortedData.length;
    const units = filteredAndSortedData.reduce(
      (sum, item) => sum + (Number(item.on_hand_qty) || 0),
      0,
    );
    const value = filteredAndSortedData.reduce(
      (sum, item) => sum + (parseFloat(item.stock_value) || 0),
      0,
    );
    return { count, units, value };
  }, [filteredAndSortedData]);

  const hasActiveFilters =
    statusFilter !== "ALL" ||
    selectedCategory !== "ALL" ||
    selectedBrand !== "ALL" ||
    productTypeFilter !== "ALL" ||
    searchTerm.trim().length > 0;

  const handleResetFilters = () => {
    setStatusFilter("ALL");
    setSelectedCategory("ALL");
    setSelectedBrand("ALL");
    setProductTypeFilter("ALL");
    setSearchTerm("");
    setSortBy("QTY_ASC");
  };

  const handleOpenRowAdjust = (item: StockItem) => {
    setAdjustTargetProductId(item.id);
    setAdjustTargetOnHand(item.on_hand_qty);
    setIsAdjustmentModalOpen(true);
  };

  const handleOpenNewAdjust = () => {
    setAdjustTargetProductId(null);
    setAdjustTargetOnHand(undefined);
    setIsAdjustmentModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Inventory & Stock On Hand
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time smartphone IMEI tracking, warehouse valuations, and stock adjustments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2 text-xs font-bold text-rose-700 hover:bg-rose-100 shadow-2xs transition-colors"
            >
              <span>✕</span>
              <span>Reset Filters</span>
            </button>
          )}

          {/* Barcode / IMEI Camera Scanner */}
          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-purple-300 bg-purple-50 px-3.5 py-2 text-xs font-bold text-purple-800 hover:bg-purple-100 shadow-2xs transition-colors"
            title="Scan phone packaging barcode or IMEI with camera"
          >
            <span>📷</span>
            <span>Scan IMEI / SKU</span>
          </button>

          <button
            type="button"
            onClick={() => setIsHistoryModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3.5 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors"
          >
            <span>📜</span>
            <span>Adjustment Logs</span>
          </button>

          <button
            type="button"
            onClick={handleOpenNewAdjust}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-md transition-colors"
          >
            <span>⚙️</span>
            <span>+ Stock Adjustment</span>
          </button>

          <button
            type="button"
            onClick={loadStockData}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 shadow-2xs transition-colors"
            title="Refresh inventory"
          >
            <span>⟳</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-xl bg-emerald-50 px-4 py-3 text-xs text-emerald-800 border border-emerald-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span>✓</span>
            <span className="font-semibold">{successMsg}</span>
          </div>
          <button
            type="button"
            onClick={() => setSuccessMsg("")}
            className="font-bold text-emerald-600 hover:text-emerald-800"
          >
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-3 text-xs text-rose-700 border border-rose-200 flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <span>⚠️</span>
            <span className="font-semibold">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError("")}
            className="font-bold text-rose-600 hover:text-rose-800"
          >
            &times;
          </button>
        </div>
      )}

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
              <span className="text-sm font-semibold text-gray-500 font-sans">
                units
              </span>
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

        {/* Serialized Phones Summary / Filter */}
        <button
          type="button"
          onClick={() =>
            setProductTypeFilter(
              productTypeFilter === "SERIALIZED" ? "ALL" : "SERIALIZED",
            )
          }
          className={`rounded-2xl border p-5 shadow-xs text-left transition-all ${
            productTypeFilter === "SERIALIZED"
              ? "bg-purple-50/80 border-purple-400 ring-2 ring-purple-400/30"
              : "bg-white border-gray-200 hover:border-purple-300"
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-900">
              📱 Serialized Phones
            </span>
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-100 text-purple-800 text-sm font-bold shadow-2xs">
              📱
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-extrabold text-purple-950 font-mono tracking-tight">
              {kpis.serializedUnitsCount}{" "}
              <span className="text-sm font-semibold text-purple-700 font-sans">
                units
              </span>
            </p>
            <p className="text-[11px] text-purple-700 font-medium mt-1">
              Across {kpis.serializedSkusCount} smartphone models with IMEI tracking
            </p>
          </div>
        </button>

        {/* Low Stock Warning */}
        <button
          type="button"
          onClick={() =>
            setStatusFilter(statusFilter === "LOW_STOCK" ? "ALL" : "LOW_STOCK")
          }
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
              <span className="text-sm font-semibold text-amber-700 font-sans">
                SKUs
              </span>
            </p>
            <p className="text-[11px] text-amber-700 font-medium mt-1">
              {kpis.lowStockCount > 0
                ? "At or below minimum alert threshold"
                : "All stock levels healthy"}
            </p>
          </div>
        </button>
      </div>

      {/* 🔍 Enhanced Search, Filter Toolbar & Status Tabs */}
      <div className="rounded-2xl bg-white border border-gray-200 p-4 shadow-xs space-y-3">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {[
            { id: "ALL", label: `All Stock (${kpis.totalSkus})` },
            { id: "LOW_STOCK", label: `⚠️ Low Stock (${kpis.lowStockCount})` },
            {
              id: "OUT_OF_STOCK",
              label: `🔴 Out of Stock (${kpis.outOfStockCount})`,
            },
            { id: "IN_STOCK", label: `🟢 Healthy (${kpis.inStockCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id as StatusFilter)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap shadow-2xs ${
                statusFilter === tab.id
                  ? "bg-slate-900 text-white"
                  : "bg-slate-50 text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search, Categories, Brand, Product Type & Sort Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-12 gap-2.5 pt-1">
          {/* Search Input */}
          <div className="lg:col-span-4 relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search SKU, name, brand, or category..."
              className="w-full rounded-xl border border-gray-300 bg-white px-3.5 py-2 pl-9 text-xs font-semibold placeholder:text-gray-400 focus:border-blue-500 focus:outline-none shadow-2xs"
            />
            <span className="absolute left-3 top-2.5 text-gray-400 text-xs">
              🔍
            </span>
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2 text-gray-400 hover:text-gray-600 font-bold text-xs"
              >
                &times;
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:border-blue-500 focus:outline-none shadow-2xs"
            >
              <option value="ALL">📁 All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={String(cat.id)}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:border-blue-500 focus:outline-none shadow-2xs"
            >
              <option value="ALL">🏷️ All Brands</option>
              {brands.map((b) => (
                <option key={b.id} value={String(b.id)}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product Type Filter */}
          <div className="lg:col-span-2">
            <select
              value={productTypeFilter}
              onChange={(e) =>
                setProductTypeFilter(e.target.value as ProductTypeFilter)
              }
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:border-blue-500 focus:outline-none shadow-2xs"
            >
              <option value="ALL">📦 All Types</option>
              <option value="SERIALIZED">📱 Serialized (IMEI)</option>
              <option value="NON_SERIALIZED">📦 Standard Stock</option>
            </select>
          </div>

          {/* Sort By Dropdown */}
          <div className="lg:col-span-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-xs font-semibold text-gray-700 focus:border-blue-500 focus:outline-none shadow-2xs"
            >
              <option value="QTY_ASC">Qty (Lowest First)</option>
              <option value="QTY_DESC">Qty (Highest First)</option>
              <option value="VALUE_DESC">Valuation (Highest)</option>
              <option value="NAME_ASC">Name (A → Z)</option>
              <option value="NAME_DESC">Name (Z → A)</option>
              <option value="SKU_ASC">SKU (A → Z)</option>
            </select>
          </div>
        </div>

        {/* Filter Summary Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs text-gray-500 font-medium">
          <div className="flex items-center gap-3">
            <span>
              Showing{" "}
              <strong className="text-gray-900 font-mono font-bold">
                {filteredSummary.count}
              </strong>{" "}
              of {kpis.totalSkus} SKUs
            </span>
            <span>&bull;</span>
            <span>
              Physical Units:{" "}
              <strong className="text-blue-700 font-mono font-bold">
                {filteredSummary.units.toLocaleString("id-ID")}
              </strong>
            </span>
            <span>&bull;</span>
            <span>
              Valuation:{" "}
              <strong className="text-gray-900 font-mono font-bold">
                IDR {filteredSummary.value.toLocaleString("id-ID")}
              </strong>
            </span>
          </div>

          {hasActiveFilters && (
            <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              ⚡ Filter Active
            </span>
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
        ) : filteredAndSortedData.length === 0 ? (
          <div className="p-12 text-center text-xs text-gray-500 space-y-2">
            <span>No products matching your search or active filters.</span>
            <div>
              <button
                type="button"
                onClick={handleResetFilters}
                className="text-xs font-bold text-blue-600 hover:underline"
              >
                Clear all filters
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs whitespace-nowrap">
              <thead className="border-b border-gray-200 bg-slate-50 text-[11px] font-bold text-gray-600 uppercase tracking-wider">
                <tr>
                  <th className="px-4 py-3">Product / SKU</th>
                  <th className="px-4 py-3">Category & Brand</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">On Hand</th>
                  <th className="px-4 py-3 text-left pl-6">Stock Health Bar</th>
                  <th className="px-4 py-3 text-right">Reserved</th>
                  <th className="px-4 py-3 text-right">Min Alert</th>
                  <th className="px-4 py-3 text-right">Unit Cost</th>
                  <th className="px-4 py-3 text-right">Retail SRP</th>
                  <th className="px-4 py-3 text-right">Total Stock Value</th>
                  <th className="px-4 py-3 text-center">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-mono">
                {filteredAndSortedData.map((item) => {
                  const qty = Number(item.on_hand_qty) || 0;
                  const minAlert = Number(item.min_stock_alert) || 0;
                  const isDepleted = qty === 0;
                  const isLow = qty > 0 && qty <= minAlert;
                  const isModerate = qty > minAlert && qty <= minAlert * 2;
                  const isSerialized = item.product_type === "SERIALIZED";

                  // Health bar percentage calculation (0 to 100%)
                  const maxRef = Math.max(minAlert * 3, 10);
                  const healthPercent = Math.min(100, Math.round((qty / maxRef) * 100));

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50/70 transition-colors ${
                        isDepleted
                          ? "bg-rose-50/30"
                          : isLow
                            ? "bg-amber-50/30"
                            : ""
                      }`}
                    >
                      {/* Product Name & SKU */}
                      <td className="px-4 py-3 font-sans">
                        <div className="font-bold text-gray-900 leading-tight">
                          {item.name}
                        </div>
                        <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                          {item.sku}
                        </div>
                      </td>

                      {/* Category & Brand */}
                      <td className="px-4 py-3 font-sans text-gray-600 text-[11px]">
                        <div className="font-medium text-gray-800">
                          {item.category ?? "-"}
                        </div>
                        <div className="text-gray-400">
                          {item.brand ?? "-"}
                        </div>
                      </td>

                      {/* Product Type (Clickable for Serialized IMEI) */}
                      <td className="px-4 py-3 font-sans">
                        {isSerialized ? (
                          <button
                            type="button"
                            onClick={() => setSelectedImeiProduct(item)}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 hover:bg-purple-100 transition-colors shadow-2xs"
                            title="Click to view all in-stock IMEI physical units"
                          >
                            <span>📱 IMEI</span>
                            <span>({qty}) ↗</span>
                          </button>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-700">
                            Standard
                          </span>
                        )}
                      </td>

                      {/* On Hand Qty */}
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

                      {/* Stock Health Bar */}
                      <td className="px-4 py-3 pl-6">
                        <div className="w-28 space-y-1">
                          <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
                            <div
                              style={{
                                width: `${
                                  isDepleted
                                    ? 0
                                    : Math.max(8, healthPercent)
                                }%`,
                              }}
                              className={`h-full rounded-full transition-all ${
                                isDepleted
                                  ? "bg-rose-500"
                                  : isLow
                                    ? "bg-amber-500"
                                    : isModerate
                                      ? "bg-blue-500"
                                      : "bg-emerald-500"
                              }`}
                            ></div>
                          </div>
                          <span className="text-[9px] text-gray-400 font-sans block">
                            {isDepleted
                              ? "0% Depleted"
                              : `${qty} of ~${maxRef} target`}
                          </span>
                        </div>
                      </td>

                      {/* Reserved */}
                      <td className="px-4 py-3 text-right text-gray-500">
                        {item.reserved_qty > 0 ? (
                          <span className="font-semibold text-amber-700">
                            {item.reserved_qty}
                          </span>
                        ) : (
                          "0"
                        )}
                      </td>

                      {/* Min Stock Alert */}
                      <td className="px-4 py-3 text-right text-gray-400">
                        {item.min_stock_alert}
                      </td>

                      {/* Unit Cost */}
                      <td className="px-4 py-3 text-right text-gray-600">
                        IDR{" "}
                        {parseFloat(item.cost_price || "0").toLocaleString(
                          "id-ID",
                        )}
                      </td>

                      {/* Retail SRP */}
                      <td className="px-4 py-3 text-right text-blue-700 font-semibold">
                        IDR{" "}
                        {parseFloat(item.srp || "0").toLocaleString("id-ID")}
                      </td>

                      {/* Total Stock Value */}
                      <td className="px-4 py-3 text-right font-bold text-gray-900">
                        IDR{" "}
                        {parseFloat(item.stock_value || "0").toLocaleString(
                          "id-ID",
                        )}
                      </td>

                      {/* Status Badge */}
                      <td className="px-4 py-3 text-center font-sans">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            isDepleted
                              ? "bg-rose-100 text-rose-800"
                              : isLow
                                ? "bg-amber-100 text-amber-800"
                                : isModerate
                                  ? "bg-blue-50 text-blue-800 border border-blue-200"
                                  : "bg-emerald-100 text-emerald-800"
                          }`}
                        >
                          {isDepleted
                            ? "🔴 Out of Stock"
                            : isLow
                              ? "⚠️ Low Stock"
                              : isModerate
                                ? "🟡 Moderate"
                                : "🟢 Healthy"}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right font-sans">
                        <div className="flex items-center justify-end gap-1.5">
                          {isSerialized && (
                            <button
                              type="button"
                              onClick={() => setSelectedImeiProduct(item)}
                              className="px-2 py-1 text-[11px] font-bold text-purple-700 hover:bg-purple-100 bg-purple-50 border border-purple-200 rounded-lg transition-colors shadow-2xs"
                              title="View IMEIs list"
                            >
                              📱 IMEIs
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenRowAdjust(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:text-blue-700 bg-slate-100 hover:bg-blue-50 border border-slate-300 hover:border-blue-300 rounded-lg transition-colors shadow-2xs"
                            title="Record Stock Adjustment / Damage"
                          >
                            <span>⚙️</span>
                            <span>Adjust</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 🛠️ Stock Adjustment Modal */}
      <StockAdjustmentModal
        isOpen={isAdjustmentModalOpen}
        onClose={() => setIsAdjustmentModalOpen(false)}
        products={modalProducts}
        initialProductId={adjustTargetProductId}
        initialOnHand={adjustTargetOnHand}
        onSuccess={(msg) => {
          setSuccessMsg(msg);
          loadStockData();
          setTimeout(() => setSuccessMsg(""), 4000);
        }}
      />

      {/* 📜 Stock Adjustments History Log Modal */}
      <StockAdjustmentsHistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
      />

      {/* 📱 Serialized IMEI Units Breakdown Modal */}
      <ProductImeisModal
        isOpen={selectedImeiProduct !== null}
        onClose={() => setSelectedImeiProduct(null)}
        product={selectedImeiProduct}
        onUnitUpdated={() => loadStockData()}
      />

      {/* 📷 Barcode / IMEI Camera Scanner */}
      {isScannerOpen && (
        <CameraBarcodeScanner
          isOpen={true}
          onClose={() => setIsScannerOpen(false)}
          onScan={(code) => {
            handleBarcodeScanned(code);
            setIsScannerOpen(false);
          }}
          title="Scan Smartphone IMEI or SKU"
          subtitle="Point camera at retail box barcode or smartphone device screen"
        />
      )}
    </div>
  );
}
