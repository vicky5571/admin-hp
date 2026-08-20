"use client";

import { useMemo, useState } from "react";

export interface BulkImeiParsedUnit {
  imei: string;
  conditionGrade?: string | null;
  batteryHealth?: number | null;
}

interface BulkImeiModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApply: (imeis: string[], imeiUnits?: BulkImeiParsedUnit[]) => void;
  productName?: string;
  productSku?: string;
  targetQty?: number;
  existingImeis?: string[];
}

const COMMON_GRADES = [
  "Brand New",
  "Grade A",
  "Grade B",
  "Grade C",
  "Like New",
];

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
  const [batchGrade, setBatchGrade] = useState("");
  const [batchBattery, setBatchBattery] = useState("");

  // Parse and deduplicate raw text into clean IMEI tokens & structured units
  const { validUnits, validImeis, duplicateCount, existingOverlapCount } = useMemo(() => {
    if (!rawText.trim()) {
      return { validUnits: [], validImeis: [], duplicateCount: 0, existingOverlapCount: 0 };
    }

    const lines = rawText.split(/[\r\n]+/);
    const parsedList: BulkImeiParsedUnit[] = [];
    const uniqueSet = new Set<string>();
    let duplicates = 0;
    let existingDuplicates = 0;

    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line) continue;

      // Check if line contains CSV/tab tokens: "IMEI, Grade, Battery"
      const parts = line.split(/[,;\t]+/).map((p) => p.trim());
      const cleanImei = parts[0]?.replace(/[^a-zA-Z0-9]/g, "") || "";

      if (cleanImei.length < 8) continue;

      if (existingImeis.includes(cleanImei)) {
        existingDuplicates++;
      }
      if (uniqueSet.has(cleanImei)) {
        duplicates++;
        continue;
      }

      uniqueSet.add(cleanImei);

      // Line-specific grade or batch default
      const lineGrade = parts[1] ? parts[1] : batchGrade.trim() || undefined;
      // Line-specific battery or batch default
      const rawBattery = parts[2] ? parseInt(parts[2].replace(/[^0-9]/g, ""), 10) : (batchBattery.trim() ? parseInt(batchBattery.trim(), 10) : undefined);
      const lineBattery = rawBattery !== undefined && !isNaN(rawBattery) ? Math.min(100, Math.max(0, rawBattery)) : undefined;

      parsedList.push({
        imei: cleanImei,
        conditionGrade: lineGrade || null,
        batteryHealth: lineBattery != null ? lineBattery : null,
      });
    }

    return {
      validUnits: parsedList,
      validImeis: Array.from(uniqueSet),
      duplicateCount: duplicates,
      existingOverlapCount: existingDuplicates,
    };
  }, [rawText, existingImeis, batchGrade, batchBattery]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (validImeis.length === 0) return;
    onApply(validImeis, validUnits);
    setRawText("");
    setBatchGrade("");
    setBatchBattery("");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl border border-gray-100 flex flex-col max-h-[92vh] overflow-y-auto">
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
            Paste IMEIs from Excel, Google Sheets, or supplier packing slips. You can paste plain IMEIs or CSV format (<code>IMEI, Grade, BatteryHealth</code>).
          </p>
        </div>

        {/* Batch Condition & Battery Presets */}
        <div className="mb-3.5 p-3 rounded-xl bg-gray-50 border border-gray-200">
          <p className="text-xs font-semibold text-gray-700 uppercase mb-2">
            Batch Presets <span className="text-gray-400 font-normal lowercase">(applied to pasted IMEIs without explicit grade)</span>
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                Batch Condition Grade
              </label>
              <div className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="e.g. Grade A or Brand New"
                  value={batchGrade}
                  onChange={(e) => setBatchGrade(e.target.value)}
                  className="flex-1 rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs bg-white focus:border-blue-500 focus:outline-none"
                />
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value) setBatchGrade(e.target.value);
                  }}
                  className="rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-white focus:outline-none"
                >
                  <option value="">Presets</option>
                  {COMMON_GRADES.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-medium text-gray-600 mb-1">
                Batch Battery Health (%)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                placeholder="e.g. 100 or 95"
                value={batchBattery}
                onChange={(e) => setBatchBattery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2.5 py-1.5 text-xs font-mono bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Textarea */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            IMEI List Input
          </label>
          <textarea
            rows={6}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            placeholder={"Paste IMEIs here, for example:\n358921098471928\n358921098471929\n358921098471930, Grade A, 95..."}
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
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
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
