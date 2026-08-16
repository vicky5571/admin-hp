"use client";

import { useEffect, useState } from "react";
import { fetchProducts } from "@/lib/api";

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts({ limit: 50 })
      .then((res) => setProducts(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">Products</h1>
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Cost Price</th>
              <th className="px-4 py-3 font-medium">Selling Price</th>
              <th className="px-4 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            )}
            {!loading && products.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No products found
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-3 font-medium">{p.sku}</td>
                <td className="px-4 py-3">{p.name}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-gray-100 px-1.5 py-0.5 text-xs">
                    {p.productType}
                  </span>
                </td>
                <td className="px-4 py-3">
                  IDR {parseFloat(p.costPrice).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  IDR {parseFloat(p.sellingPrice).toLocaleString()}
                </td>
                <td className="px-4 py-3">
                  {p.isActive ? (
                    <span className="text-green-600">Active</span>
                  ) : (
                    <span className="text-red-500">Inactive</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}