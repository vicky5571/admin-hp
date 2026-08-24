"use client";

import { useMemo, useState } from "react";
import { Category, Product } from "@/lib/api";

interface PosProductCatalogProps {
  products: Product[];
  categories: Category[];
  loading: boolean;
  onAddToCart: (product: Product) => void;
  onOpenScanner: () => void;
}

export default function PosProductCatalog({
  products,
  categories,
  loading,
  onAddToCart,
  onOpenScanner,
}: PosProductCatalogProps) {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  // Filter products by category and search
  const filteredProducts = useMemo(() => {
    let result = products;

    if (selectedCategory !== "ALL") {
      result = result.filter(
        (p) => String(p.categoryId) === selectedCategory,
      );
    }

    if (search.trim()) {
      const q = search.toLowerCase().trim();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.sku.toLowerCase().includes(q),
      );
    }

    return result;
  }, [products, selectedCategory, search]);

  return (
    <div className="flex flex-col h-full space-y-3">
      {/* Search Bar & Barcode Camera Trigger */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search product name, SKU, or barcode (F3)..."
            className="w-full rounded-xl border border-gray-300 bg-white py-2.5 pl-9 pr-8 text-xs font-semibold placeholder:text-gray-400 focus:border-blue-500 focus:outline-none shadow-2xs"
          />
          <span className="absolute left-3 top-2.5 text-gray-400 text-sm">
            🔍
          </span>
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-2.5 text-gray-400 hover:text-gray-600 font-bold text-xs"
            >
              &times;
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onOpenScanner}
          className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5 text-xs font-bold text-emerald-800 hover:bg-emerald-100 transition-colors shadow-2xs shrink-0"
          title="Scan barcode with camera"
        >
          <span>📷</span>
          <span className="hidden sm:inline">Scan</span>
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <button
          type="button"
          onClick={() => setSelectedCategory("ALL")}
          className={`px-3 py-1.5 rounded-xl font-bold transition-colors shrink-0 shadow-2xs ${
            selectedCategory === "ALL"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          All Items ({products.length})
        </button>

        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setSelectedCategory(String(cat.id))}
            className={`px-3 py-1.5 rounded-xl font-bold transition-colors shrink-0 shadow-2xs ${
              selectedCategory === String(cat.id)
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {/* Product Cards Grid */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-xs">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
            Loading catalog...
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-xs">
            <span>📦 No products found</span>
            {search && (
              <button
                onClick={() => setSearch("")}
                className="mt-2 text-blue-600 font-bold hover:underline"
              >
                Clear Search
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
            {filteredProducts.map((p) => {
              const price = parseFloat(p.srp || "0") || 0;
              const isSerialized = p.productType === "SERIALIZED";

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onAddToCart(p)}
                  className="group relative flex flex-col justify-between p-3 rounded-2xl border border-gray-200 bg-white hover:border-blue-500 hover:shadow-md transition-all text-left overflow-hidden active:scale-[0.98]"
                >
                  <div>
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-[10px] font-mono text-gray-400 truncate">
                        {p.sku}
                      </span>
                      {isSerialized && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                          IMEI
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-bold text-gray-900 group-hover:text-blue-600 line-clamp-2 leading-tight">
                      {p.name}
                    </p>
                  </div>

                  <div className="mt-3 pt-2 border-t border-gray-100 flex items-baseline justify-between">
                    <span className="text-xs font-black font-mono text-blue-700">
                      IDR {price.toLocaleString("id-ID")}
                    </span>
                    <span className="text-[10px] text-gray-400 font-bold group-hover:text-blue-600">
                      + Add
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
