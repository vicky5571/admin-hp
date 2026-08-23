"use client";

import { useEffect, useState } from "react";
import { CartItem } from "../types";

interface PosPriceEditModalProps {
  item: CartItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSavePrice: (productId: number, newPrice: number) => void;
}

export default function PosPriceEditModal({
  item,
  isOpen,
  onClose,
  onSavePrice,
}: PosPriceEditModalProps) {
  const [priceInput, setPriceInput] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && item) {
      setPriceInput(String(item.unitPrice));
      setError("");
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(priceInput);
    if (isNaN(num) || num < 0) {
      setError("Please enter a valid non-negative unit price.");
      return;
    }
    onSavePrice(item.productId, num);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-gray-200 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Price Negotiation / Override
            </h3>
            <p className="text-[11px] text-gray-500">{item.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg"
          >
            &times;
          </button>
        </div>

        <div className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
          <div className="flex justify-between text-gray-500">
            <span>Default SRP:</span>
            <span className="font-mono font-semibold">
              IDR {item.srp.toLocaleString("id-ID")}
            </span>
          </div>
          <div className="flex justify-between text-gray-700">
            <span>Quantity ringing up:</span>
            <span className="font-mono font-bold">{item.qty} units</span>
          </div>
        </div>

        {error && (
          <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            ⚠️ {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Negotiated Unit Price (IDR):
            </label>
            <input
              type="number"
              min="0"
              step="1000"
              value={priceInput}
              onChange={(e) => setPriceInput(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-3.5 py-2.5 text-sm font-mono font-bold text-blue-700 focus:border-blue-500 focus:outline-none"
              autoFocus
              required
            />
          </div>

          <div className="flex justify-between items-center pt-1">
            <button
              type="button"
              onClick={() => setPriceInput(String(item.srp))}
              className="text-[11px] text-blue-600 hover:underline font-semibold"
            >
              Reset to SRP (IDR {item.srp.toLocaleString("id-ID")})
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md"
              >
                Apply Price
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
