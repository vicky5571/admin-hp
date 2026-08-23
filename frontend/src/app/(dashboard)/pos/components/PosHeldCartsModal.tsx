"use client";

import { HeldCart } from "../types";

interface PosHeldCartsModalProps {
  isOpen: boolean;
  heldCarts: HeldCart[];
  onClose: () => void;
  onResumeCart: (heldId: string) => void;
  onDiscardCart: (heldId: string) => void;
}

export default function PosHeldCartsModal({
  isOpen,
  heldCarts,
  onClose,
  onResumeCart,
  onDiscardCart,
}: PosHeldCartsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-gray-200 space-y-4">
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Suspended / Held Customer Carts
            </h3>
            <p className="text-[11px] text-gray-500">
              Resume order billing or discard abandoned carts
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold text-lg"
          >
            &times;
          </button>
        </div>

        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
          {heldCarts.length === 0 ? (
            <div className="py-8 text-center text-xs text-gray-400">
              No suspended carts currently held in memory.
            </div>
          ) : (
            heldCarts.map((held) => (
              <div
                key={held.id}
                className="p-3.5 rounded-xl border border-gray-200 bg-slate-50 flex items-center justify-between hover:bg-slate-100 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-xs text-gray-900">
                      {held.id}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      at {held.savedAt}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 mt-1 font-mono">
                    <span className="font-semibold">{held.itemCount} items</span> &bull;{" "}
                    <span className="font-bold text-blue-700">
                      IDR {held.subtotal.toLocaleString("id-ID")}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => onDiscardCart(held.id)}
                    className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-rose-600 hover:bg-rose-50 border border-rose-200"
                  >
                    Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => onResumeCart(held.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-2xs"
                  >
                    Resume
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
