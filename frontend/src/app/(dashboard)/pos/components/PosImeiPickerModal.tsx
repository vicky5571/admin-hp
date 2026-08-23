"use client";

import { useEffect, useState } from "react";
import { fetchAvailableImeis, ImeiUnit } from "@/lib/api";
import { CartItem } from "../types";

interface PosImeiPickerModalProps {
  item: CartItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSaveImeis: (productId: number, imeis: string[]) => void;
}

export default function PosImeiPickerModal({
  item,
  isOpen,
  onClose,
  onSaveImeis,
}: PosImeiPickerModalProps) {
  const [availableImeis, setAvailableImeis] = useState<ImeiUnit[]>([]);
  const [selectedImeis, setSelectedImeis] = useState<string[]>([]);
  const [customImeiInput, setCustomImeiInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen && item) {
      setSelectedImeis([...item.imeis]);
      setCustomImeiInput("");
      setError("");
      setLoading(true);

      fetchAvailableImeis(item.productId)
        .then((res) => {
          setAvailableImeis(res.data ?? []);
        })
        .catch(() => {
          setAvailableImeis([]);
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, item]);

  if (!isOpen || !item) return null;

  const requiredCount = item.qty;
  const isSatisfied = selectedImeis.length === requiredCount;

  const handleToggleImei = (imei: string) => {
    if (selectedImeis.includes(imei)) {
      setSelectedImeis(selectedImeis.filter((i) => i !== imei));
    } else {
      if (selectedImeis.length >= requiredCount) {
        setError(`Already selected ${requiredCount} required IMEI(s)`);
        return;
      }
      setError("");
      setSelectedImeis([...selectedImeis, imei]);
    }
  };

  const handleAddCustomImei = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customImeiInput.trim();
    if (!clean) return;

    if (selectedImeis.includes(clean)) {
      setError("IMEI already selected");
      return;
    }
    if (selectedImeis.length >= requiredCount) {
      setError(`Cannot add more than ${requiredCount} IMEI(s)`);
      return;
    }

    setError("");
    setSelectedImeis([...selectedImeis, clean]);
    setCustomImeiInput("");
  };

  const handleConfirm = () => {
    if (selectedImeis.length !== requiredCount) {
      setError(
        `Please select exactly ${requiredCount} IMEI(s) (currently ${selectedImeis.length})`,
      );
      return;
    }
    onSaveImeis(item.productId, selectedImeis);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-gray-200 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-gray-900">
              Assign Serialized IMEIs
            </h3>
            <p className="text-[11px] text-gray-500 font-mono">
              {item.name} &bull; Qty: {item.qty}
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

        {/* Selected Count Indicator */}
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            isSatisfied
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-amber-50 border-amber-200 text-amber-800"
          }`}
        >
          <span>
            {isSatisfied
              ? "✓ Exactly assigned!"
              : `Assign ${requiredCount - selectedImeis.length} more IMEI(s)`}
          </span>
          <span className="font-mono font-bold">
            {selectedImeis.length} / {requiredCount}
          </span>
        </div>

        {error && (
          <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
            ⚠️ {error}
          </div>
        )}

        {/* Available IMEIs in Stock */}
        <div>
          <label className="block text-xs font-bold text-gray-700 mb-1.5">
            Available In Stock:
          </label>
          <div className="max-h-36 overflow-y-auto space-y-1 rounded-xl border border-gray-200 p-2 bg-slate-50">
            {loading ? (
              <div className="text-center py-4 text-xs text-gray-400">
                Loading available IMEIs...
              </div>
            ) : availableImeis.length === 0 ? (
              <div className="text-center py-4 text-xs text-gray-400">
                No active stock units found in catalog. Enter manually below.
              </div>
            ) : (
              availableImeis.map((u) => {
                const isSelected = selectedImeis.includes(u.imei);
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => handleToggleImei(u.imei)}
                    className={`w-full flex items-center justify-between p-2 rounded-lg text-xs font-mono transition-colors text-left ${
                      isSelected
                        ? "bg-blue-600 text-white font-bold"
                        : "bg-white text-gray-700 hover:bg-blue-50 border border-gray-200"
                    }`}
                  >
                    <span>{u.imei}</span>
                    <span className="text-[10px] opacity-80">
                      {isSelected ? "✓ Selected" : "+ Pick"}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* Manual IMEI Input Form */}
        <form onSubmit={handleAddCustomImei} className="flex gap-2">
          <input
            type="text"
            value={customImeiInput}
            onChange={(e) => setCustomImeiInput(e.target.value)}
            placeholder="Scan or enter manual IMEI..."
            className="flex-1 rounded-xl border border-gray-300 px-3 py-2 text-xs font-mono focus:border-blue-500 focus:outline-none"
          />
          <button
            type="submit"
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold rounded-xl border border-gray-300"
          >
            + Add
          </button>
        </form>

        {/* Selected List Chips */}
        {selectedImeis.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {selectedImeis.map((imei) => (
              <span
                key={imei}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-blue-50 text-blue-800 border border-blue-200"
              >
                <span>{imei}</span>
                <button
                  type="button"
                  onClick={() => handleToggleImei(imei)}
                  className="text-blue-500 hover:text-rose-600 font-bold"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-xl"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md transition-colors"
          >
            Confirm IMEIs
          </button>
        </div>
      </div>
    </div>
  );
}
