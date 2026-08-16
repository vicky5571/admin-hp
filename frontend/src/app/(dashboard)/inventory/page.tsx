"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export default function InventoryPage() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiFetch<any>("/reports/stock-on-hand")
      .then((res) => setData(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Inventory / Stock
      </h1>
      <div className="rounded-xl bg-white shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50 text-left text-gray-500">
              <th className="px-4 py-3 font-medium">SKU</th>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">On Hand</th>
              <th className="px-4 py-3 font-medium">Reserved</th>
              <th className="px-4 py-3 font-medium">Min Alert</th>
              <th className="px-4 py-3 font-medium">Stock Value</th>
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
            {!loading && data.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  No stock data
                </td>
              </tr>
            )}
            {data.map((item: any) => (
              <tr
                key={item.id}
                className={`border-b border-gray-100 hover:bg-gray-50 ${
                  item.on_hand_qty <= item.min_stock_alert
                    ? "bg-red-50"
                    : ""
                }`}
              >
                <td className="px-4 py-3 font-medium">{item.sku}</td>
                <td className="px-4 py-3">{item.name}</td>
                <td className="px-4 py-3 font-medium">{item.on_hand_qty}</td>
                <td className="px-4 py-3">{item.reserved_qty}</td>
                <td className="px-4 py-3">{item.min_stock_alert}</td>
                <td className="px-4 py-3">
                  IDR {parseFloat(item.stock_value || 0).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}