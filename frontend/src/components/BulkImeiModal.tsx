"use client";

import { useMemo, useState } from "react";

export interface BulkImeiParsedUnit {
  imei: string;
  conditionGrade?: string | null;
  batteryHealth?: number | null;
  costPrice?: number | null;
  sellingPrice?: number | null;
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
  const [batchCost, setBatchCost] = useState("");
  const [batchSellingPrice, setBatchSellingPrice] = useState("");

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

      // Check if line contains CSV/tab tokens: "IMEI, Grade, Battery, Cost, SRP"
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
      const rawBattery = parts[2]
        ? parseInt(parts[2].replace(/[^0-9]/g, ""), 10)
        : batchBattery.trim()
          ? parseInt(batchBattery.trim(), 10)
          : undefined;
      const lineBattery =
        rawBattery !== undefined && !isNaN(rawBattery)
          ? Math.min(100, Math.max(0, rawBattery))
          : undefined;

      // Line-specific cost or batch default
      const rawCost = parts[3]
        ? parseFloat(parts[3].replace(/[^0-9.]/g, ""))
        : batchCost.trim()
          ? parseFloat(batchCost.trim())
          : undefined;
      const lineCost = rawCost !== undefined && !isNaN(rawCost) ? rawCost : undefined;

      // Line-specific selling price or batch default
      const rawSrp = parts[4]
        ? parseFloat(parts[4].replace(/[^0-9.]/g, ""))
        : batchSellingPrice.trim()
          ? parseFloat(batchSellingPrice.trim())
          : undefined;
      const lineSrp = rawSrp !== undefined && !isNaN(rawSrp) ? rawSrp : undefined;

      parsedList.push({
        imei: cleanImei,
        conditionGrade: lineGrade || null,
        batteryHealth: lineBattery != null ? lineBattery : null,
        costPrice: lineCost != null ? lineCost : null,
        sellingPrice: lineSrp != null ? lineSrp : null,
      });
    }

    return {
      validUnits: parsedList,
      validImeis: Array.from(uniqueSet),
      duplicateCount: duplicates,
      existingOverlapCount: existingDuplicates,
    };
  }, [rawText, existingImeis, batchGrade, batchBattery, batchCost, batchSellingPrice]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (validImeis.length === 0) return;
    onApply(validImeis, validUnits);
    setRawText("");
    setBatchGrade("");
    setBatchBattery("");
    setBatchCost("");
    setBatchSellingPrice("");
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
            Paste IMEIs from Excel, Google Sheets, or supplier buyback slips. Format: <code>IMEI, Grade, BatteryHealth, Cost, SellingPrice</code>.
          </p>
        </div>

        {/* Batch Condition, Battery & Price Presets */}
        <div className="mb-3.5 p-3 rounded-xl bg-gray-50 border border-gray-200">
          <p className="text-xs font-semibold text-gray-700 uppercase mb-2">
            Batch Presets <span className="text-gray-400 font-normal lowercase">(applied to pasted IMEIs)</span>
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">
                Grade
              </label>
              <input
                type="text"
                placeholder="e.g. Grade A"
                value={batchGrade}
                onChange={(e) => setBatchGrade(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">
                Battery (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                placeholder="e.g. 95"
                value={batchBattery}
                onChange={(e) => setBatchBattery(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">
                Cost (Modal)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                value={batchCost}
                onChange={(e) => setBatchCost(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs font-mono bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">
                SRP (Jual)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                placeholder="0"
                value={batchSellingPrice}
                onChange={(e) => setBatchSellingPrice(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-2 py-1.5 text-xs font-mono bg-white focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Text Area */}
        <div className="mb-3">
          <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
            IMEI List (One per line or comma-separated)
          </label>
          <textarea
            rows={6}
            placeholder={`354892091234567\n354892097654321, Grade A, 92, 7000000, 8400000\n354892099999999`}
            value={rawText}
            onChange={(e) => setRawText(e.target.value)}
            className="w-full rounded-xl border border-gray-300 p-3 font-mono text-xs focus:border-blue-500 focus:outline-none leading-relaxed"
          />
        </div>

        {/* Live Parsing Stats */}
        <div className="flex flex-wrap items-center justify-between text-xs mb-4 gap-2">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-gray-900">
              Parsed:{" "}
              <strong className="text-blue-700 font-mono text-sm">
                {validImeis.length}
              </strong>{" "}
              units
            </span>
            {targetQty !== undefined && (
              <span className="text-gray-500">
                (Target: <strong>{targetQty}</strong>)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {duplicateCount > 0 && (
              <span className="text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 text-[11px]">
                ⚠️ {duplicateCount} duplicate(s) ignored
              </span>
            )}
            {existingOverlapCount > 0 && (
              <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 text-[11px]">
                ⚠️ {existingOverlapCount} already in list
              </span>
            )}
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex justify-end gap-2.5 pt-3 border-t border-gray-100">
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
            disabled={validImeis.length === 0}
            className="px-5 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl disabled:opacity-40 transition-colors shadow-xs"
          >
            Import {validImeis.length} IMEIs
          </button>
        </div>
      </div>
    </div>
  );
}
