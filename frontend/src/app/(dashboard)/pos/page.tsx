"use client";

import { useState, useEffect } from "react";
import { fetchProducts, createSale } from "@/lib/api";

interface CartItem {
  productId: number;
  sku: string;
  name: string;
  productType: string;
  qty: number;
  unitPrice: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  imeis: string[];
}

export default function PosPage() {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<any[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [payMethod, setPayMethod] = useState("CASH");
  const [payAmount, setPayAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (search.length < 2) {
      setProducts([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetchProducts({ q: search, limit: 10 });
        setProducts(res.data);
      } catch {
        setProducts([]);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) {
        return prev.map((i) =>
          i.productId === product.id
            ? {
                ...i,
                qty: i.qty + 1,
                lineTotal: (i.qty + 1) * i.unitPrice,
              }
            : i,
        );
      }
      const price = parseFloat(product.sellingPrice);
      return [
        ...prev,
        {
          productId: product.id,
          sku: product.sku,
          name: product.name,
          productType: product.productType,
          qty: 1,
          unitPrice: price,
          discountAmount: 0,
          taxAmount: 0,
          lineTotal: price,
          imeis: [],
        },
      ];
    });
    setSearch("");
    setProducts([]);
  };

  const updateQty = (productId: number, qty: number) => {
    if (qty < 1) {
      setCart((prev) => prev.filter((i) => i.productId !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.productId === productId
          ? { ...i, qty, lineTotal: qty * i.unitPrice }
          : i,
      ),
    );
  };

  const subtotal = cart.reduce((acc, i) => acc + i.lineTotal, 0);
  const discountTotal = cart.reduce((acc, i) => acc + i.discountAmount, 0);
  const taxTotal = cart.reduce((acc, i) => acc + i.taxAmount, 0);
  const grandTotal = subtotal - discountTotal + taxTotal;

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setError("");
    setSubmitting(true);

    try {
      const res = await createSale({
        items: cart.map((i) => ({
          productId: i.productId,
          qty: i.qty,
          unitPrice: i.unitPrice,
          discountAmount: i.discountAmount,
          taxAmount: i.taxAmount,
          lineTotal: i.lineTotal,
          imeis: i.imeis.length > 0 ? i.imeis : undefined,
        })),
        subtotal,
        discountTotal,
        taxTotal,
        grandTotal,
        payments: [
          {
            method: payMethod,
            amount: parseFloat(payAmount || String(grandTotal)),
          },
        ],
      });
      setResult(res);
      setCart([]);
      setPayAmount("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleNewSale = () => {
    setResult(null);
    setError("");
  };

  if (result) {
    return (
      <div className="max-w-lg mx-auto mt-12 text-center">
        <div className="rounded-xl bg-white p-8 shadow-sm border border-gray-200">
          <div className="text-5xl mb-4">✅</div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">
            Sale Completed
          </h2>
          <p className="text-gray-500 mb-4">
            Invoice: {result.invoiceNumber}
          </p>
          <p className="text-2xl font-bold text-green-600 mb-6">
            IDR {parseFloat(grandTotal.toFixed(2)).toLocaleString()}
          </p>
          <button
            onClick={handleNewSale}
            className="rounded-lg bg-blue-600 px-6 py-2.5 font-medium text-white hover:bg-blue-700"
          >
            New Sale
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">POS Checkout</h1>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600 border border-red-200">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Search + Products */}
        <div className="space-y-4">
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product by SKU or name..."
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              autoFocus
            />
            {products.length > 0 && (
              <div className="absolute z-10 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-lg max-h-80 overflow-auto">
                {products.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => addToCart(p)}
                    className="w-full px-4 py-3 text-left hover:bg-blue-50 border-b border-gray-100 last:border-0"
                  >
                    <p className="font-medium text-gray-900">{p.name}</p>
                    <p className="text-sm text-gray-500">
                      {p.sku} &mdash; IDR{" "}
                      {parseFloat(p.sellingPrice).toLocaleString()}
                      {p.productType === "SERIALIZED" && (
                        <span className="ml-2 text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">
                          IMEI
                        </span>
                      )}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="rounded-xl bg-white p-4 shadow-sm border border-gray-200">
            <h3 className="font-medium text-gray-900 mb-2">Quick Actions</h3>
            <div className="grid grid-cols-3 gap-2">
              <button className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium hover:bg-gray-200">
                iPhone 15
              </button>
              <button className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium hover:bg-gray-200">
                Case
              </button>
              <button className="rounded-lg bg-gray-100 px-3 py-2 text-sm font-medium hover:bg-gray-200">
                Screen Protector
              </button>
            </div>
          </div>
        </div>

        {/* Right: Cart */}
        <div className="space-y-4">
          <div className="rounded-xl bg-white shadow-sm border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h2 className="font-semibold text-gray-900">
                Cart ({cart.length} items)
              </h2>
            </div>

            <div className="max-h-80 overflow-auto">
              {cart.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-400">
                  Cart is empty. Search and add products.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.productId}
                    className="px-4 py-3 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-gray-900">
                          {item.name}
                        </p>
                        <p className="text-sm text-gray-500">
                          IDR {item.unitPrice.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQty(item.productId, item.qty - 1)}
                          className="w-7 h-7 rounded bg-gray-100 text-sm font-bold hover:bg-gray-200"
                        >
                          -
                        </button>
                        <span className="w-8 text-center font-medium">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateQty(item.productId, item.qty + 1)}
                          className="w-7 h-7 rounded bg-gray-100 text-sm font-bold hover:bg-gray-200"
                        >
                          +
                        </button>
                        <button
                          onClick={() => updateQty(item.productId, 0)}
                          className="ml-2 text-red-500 text-sm hover:text-red-700"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals */}
            <div className="px-4 py-3 border-t border-gray-200 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Subtotal</span>
                <span>IDR {subtotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Discount</span>
                <span className="text-red-500">
                  -IDR {discountTotal.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Tax</span>
                <span>IDR {taxTotal.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-lg font-bold border-t border-gray-200 pt-2">
                <span>Total</span>
                <span>IDR {grandTotal.toLocaleString()}</span>
              </div>
            </div>

            {/* Payment */}
            <div className="px-4 py-3 border-t border-gray-200 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                >
                  <option value="CASH">Cash</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="E_WALLET">E-Wallet</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Paid
                </label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={String(grandTotal)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <button
                onClick={handleCheckout}
                disabled={cart.length === 0 || submitting}
                className="w-full rounded-xl bg-green-600 px-4 py-3 text-lg font-bold text-white transition hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? "Processing..." : "Complete Sale"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}