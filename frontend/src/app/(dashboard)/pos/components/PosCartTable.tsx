"use client";

import { CartItem } from "../types";

interface PosCartTableProps {
  cart: CartItem[];
  itemCount: number;
  onUpdateQty: (productId: number, qty: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  onHoldCart: () => void;
  onOpenImeiModal: (item: CartItem) => void;
  onOpenPriceModal: (item: CartItem) => void;
  onOpenDiscountModal: (item: CartItem) => void;
}

export default function PosCartTable({
  cart,
  itemCount,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  onHoldCart,
  onOpenImeiModal,
  onOpenPriceModal,
  onOpenDiscountModal,
}: PosCartTableProps) {
  return (
    <div className="flex flex-col h-full bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
      {/* Cart Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-slate-50">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-gray-900">Current Order</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-100 text-blue-800">
            {itemCount} {itemCount === 1 ? "item" : "items"}
          </span>
        </div>

        {cart.length > 0 && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onHoldCart}
              className="px-2 py-1 rounded-lg text-[11px] font-bold text-amber-700 hover:bg-amber-100 bg-amber-50 border border-amber-200 transition-colors"
              title="Hold / Suspend this cart"
            >
              ⏸ Hold Cart
            </button>
            <button
              type="button"
              onClick={onClearCart}
              className="px-2 py-1 rounded-lg text-[11px] font-bold text-rose-600 hover:bg-rose-50 border border-rose-200 transition-colors"
              title="Clear all cart items"
            >
              🗑 Clear
            </button>
          </div>
        )}
      </div>

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto divide-y divide-gray-100">
        {cart.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400 text-xs p-4 text-center">
            <span className="text-2xl mb-1">🛒</span>
            <p className="font-semibold text-gray-600">Cart is empty</p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Click products on the left or scan barcodes to begin billing.
            </p>
          </div>
        ) : (
          cart.map((item) => {
            const isSerialized = item.productType === "SERIALIZED";
            const imeiAssignedCount = item.imeis.length;
            const imeiComplete = imeiAssignedCount === item.qty;
            const isPriceNegotiated = item.unitPrice !== item.srp;

            return (
              <div key={item.productId} className="p-3.5 hover:bg-slate-50/50 transition-colors space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <p className="text-xs font-bold text-gray-900 leading-tight">
                      {item.name}
                    </p>
                    <span className="text-[10px] font-mono text-gray-400">
                      {item.sku}
                    </span>
                  </div>

                  {/* Line Total */}
                  <div className="text-right">
                    <span className="text-xs font-mono font-bold text-gray-900">
                      IDR {item.lineTotal.toLocaleString("id-ID")}
                    </span>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.productId)}
                      className="text-gray-400 hover:text-rose-600 font-bold text-sm ml-2 leading-none"
                    >
                      &times;
                    </button>
                  </div>
                </div>

                {/* Controls: Quantity Adjusters & Modifiers */}
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden bg-white shadow-2xs">
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.productId, item.qty - 1)}
                      className="px-2 py-1 text-gray-600 hover:bg-gray-100 font-bold transition-colors"
                    >
                      -
                    </button>
                    <span className="px-2.5 py-1 text-[11px] font-mono font-bold text-gray-900">
                      {item.qty}
                    </span>
                    <button
                      type="button"
                      onClick={() => onUpdateQty(item.productId, item.qty + 1)}
                      className="px-2 py-1 text-gray-600 hover:bg-gray-100 font-bold transition-colors"
                    >
                      +
                    </button>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px]">
                    {/* Serialized IMEI Trigger */}
                    {isSerialized && (
                      <button
                        type="button"
                        onClick={() => onOpenImeiModal(item)}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg font-bold border transition-colors ${
                          imeiComplete
                            ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                            : "bg-rose-50 text-rose-800 border-rose-300 hover:bg-rose-100 animate-pulse"
                        }`}
                      >
                        <span>IMEI: {imeiAssignedCount}/{item.qty}</span>
                        <span>⚙️</span>
                      </button>
                    )}

                    {/* Price Edit Trigger */}
                    <button
                      type="button"
                      onClick={() => onOpenPriceModal(item)}
                      className={`px-2 py-1 rounded-lg font-semibold border transition-colors ${
                        isPriceNegotiated
                          ? "bg-amber-50 text-amber-800 border-amber-300"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      {isPriceNegotiated ? "✏️ Custom Price" : "✏️ Price"}
                    </button>

                    {/* Line Discount Trigger */}
                    <button
                      type="button"
                      onClick={() => onOpenDiscountModal(item)}
                      className="px-2 py-1 rounded-lg font-semibold text-blue-600 bg-blue-50 border border-blue-200 hover:bg-blue-100"
                    >
                      {item.discountAmount > 0
                        ? `-IDR ${item.discountAmount.toLocaleString()}`
                        : "+ Disc"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
