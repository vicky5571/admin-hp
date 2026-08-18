"use client";

import { useMemo, useState } from "react";

interface BulkImeiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (imeis: string[]) => void;
  productName?: string;
  productSku?: string;
  targetQty?: number;
  existingImeis?: string[];
}

export default function BulkImeiModal({
  isOpen,
  onClose,
  onApply,
  productName,
  productSku,
  targetQty,
  existingImeis = [],
}: BulkImeiModalProps) {
  const [rawText, setRawText] = useState("");

  // Parse and deduplicate raw text into clean IMEI tokens
  const { validImeis, duplicateCount, existingOverlapCount } = useMemo(() => {
    if (!rawText.trim()) {
      return { validImeis: [], duplicateCount: 0, existingOverlapCount: 0 };
    }

    // Split by newlines, commas, tabs, spaces, or semicolons
    const tokens = rawText
      .split(/[\r\n,;\t\s]+/)
      .map((t) => t.trim().replace(/[^a-zA-Z0-9]/g, ""))
      .filter((t) => t.length >= 8); // Minimum reasonable serial/IMEI length

    const uniqueSet = new Set<string>();
    let duplicates = 0;
    let existingDuplicates = 0;

    for (const token of tokens) {
      if (existingImeis.includes(token)) {
        existingDuplicates++;
      }
      if (uniqueSet.has(token)) {
        duplicates++;
      } else {
        uniqueSet.add(token);
      }
    }

    return {
      validImeis: Array.from(uniqueSet),
      duplicateCount: duplicates,
      existingOverlapCount: existingDuplicates,
    };
  }, [rawText, existingImeis]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (validImeis.length === 0) return;
    onApply(validImeis);
    setRawText("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-4">
          <div>
            <h3 className="text-base font-bold text-gray-900">
              Bulk IMEI / Serial Intake
            </h3>
            {productSku && (
              <p className="text-xs text-gray-500 mt-0.5">
                {productSku} {productName ? `— ${productName}` : ""}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
          >
            &times;
          </button>
        </div>

        {/* Instructions */}
        <div className="rounded-lg bg-blue-50/70 p-3 text-xs text-blue-800 border border-blue-100 mb-3 space-y-1">
          <p className="font-semibold">📋 Multi-line or Spreadsheet Paste</p>
          <p className="text-blue-700">
            Paste a list of IMEIs from Excel, Google Sheets, or supplier packing slips. They can be separated by newlines, spaces, or commas.
          </p>
        </div>

        {/* Textarea */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            IMEI List Input
          </label>
          <textarea
            rows={8}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder="Paste IMEIs here, for example:&#10;358921098471928&#10;358921098471929&#10;358921098471930..."
            className="w-full rounded-xl border border-gray-300 p-3 text-xs font-mono focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
          />
        </div>

        {/* Summary Counter & Warnings */}
        <div className="flex flex-wrap items-center justify-between gap-2 py-2 px-3 rounded-lg bg-gray-50 border border-gray-200 text-xs mb-4">
          <div className="flex items-center gap-3 font-medium">
            <span className="text-gray-600">
              Detected: <strong className="text-blue-600 font-mono">{validImeis.length}</strong> unique IMEIs
            </span>
            {targetQty !== undefined && (
              <span className={`font-semibold ${validImeis.length === targetQty ? "text-emerald-600" : "text-amber-600"}`}>
                (Target: {targetQty})
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            {duplicateCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-semibold">
                {duplicateCount} internal duplicates ignored
              </span>
            )}
            {existingOverlapCount > 0 && (
              <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-semibold">
                {existingOverlapCount} already in row
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-xs font-medium text-gray-600 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={validImeis.length === 0}
            className="rounded-lg bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            Apply {validImeis.length} IMEIs
          </button>
        </div>
      </div>
    </div>
  );
}
