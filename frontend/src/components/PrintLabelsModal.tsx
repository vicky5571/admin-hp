"use client";

import { useMemo, useState } from "react";
import { generateBarcodeSvg } from "@/lib/barcode";

export interface LabelItem {
  sku: string;
  name: string;
  price?: number;
  imei?: string;
  quantity?: number;
}

interface PrintLabelsModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: LabelItem[];
  title?: string;
}

type LabelSize = "50x30" | "40x25" | "a4_sheet";

export default function PrintLabelsModal({
  isOpen,
  onClose,
  items,
  title = "Print Barcode & Price Labels",
}: PrintLabelsModalProps) {
  const [labelSize, setLabelSize] = useState<LabelSize>("50x30");
  const [storeName, setStoreName] = useState("SMARTSTORE");
  const [showPrice, setShowPrice] = useState(true);
  const [showStoreName, setShowStoreName] = useState(true);

  // Flatten items according to quantity / IMEIs
  const flatLabels = useMemo(() => {
    const list: {
      sku: string;
      name: string;
      price?: number;
      barcodeText: string;
      barcodeType: "IMEI" | "SKU";
    }[] = [];

    for (const item of items) {
      if (item.imei) {
        list.push({
          sku: item.sku,
          name: item.name,
          price: item.price,
          barcodeText: item.imei,
          barcodeType: "IMEI",
        });
      } else {
        const qty = item.quantity || 1;
        for (let i = 0; i < qty; i++) {
          list.push({
            sku: item.sku,
            name: item.name,
            price: item.price,
            barcodeText: item.sku,
            barcodeType: "SKU",
          });
        }
      }
    }

    return list;
  }, [items]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
      <div className="w-full max-w-4xl max-h-[90vh] rounded-2xl bg-white shadow-2xl border border-gray-100 flex flex-col overflow-hidden">
        {/* Header - Screen only */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 print:hidden">
          <div>
            <h3 className="text-base font-bold text-gray-900">{title}</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Ready to print {flatLabels.length} barcode label(s)
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold p-1"
          >
            &times;
          </button>
        </div>

        {/* Configuration Bar - Screen only */}
        <div className="p-4 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4 text-xs print:hidden">
          <div className="flex flex-wrap items-center gap-4">
            <div>
              <label className="font-semibold text-gray-700 mr-2 uppercase">
                Label Format:
              </label>
              <select
                value={labelSize}
                onChange={(e) => setLabelSize(e.target.value as LabelSize)}
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-medium text-gray-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="50x30">Thermal 50mm × 30mm (Standard)</option>
                <option value="40x25">Thermal 40mm × 25mm (Compact)</option>
                <option value="a4_sheet">A4 Sheet (24 labels per sheet)</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-gray-700 mr-2 uppercase">
                Header Name:
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Store Name"
                className="rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 font-medium text-gray-800 w-32 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showPrice}
                  onChange={(e) => setShowPrice(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="font-medium text-gray-700">Show Price</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showStoreName}
                  onChange={(e) => setShowStoreName(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600"
                />
                <span className="font-medium text-gray-700">Show Store Name</span>
              </label>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>Print Labels</span>
          </button>
        </div>

        {/* Labels Preview & Print Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-100/70 print:p-0 print:bg-white print:overflow-visible">
          <div
            id="printable-labels-area"
            className={
              labelSize === "a4_sheet"
                ? "grid grid-cols-3 gap-3 p-4 bg-white shadow-sm rounded-xl max-w-3xl mx-auto print:grid-cols-3 print:gap-2 print:p-0 print:shadow-none"
                : "flex flex-wrap gap-4 justify-center print:block print:gap-0"
            }
          >
            {flatLabels.map((lbl, idx) => {
              const svgString = generateBarcodeSvg(lbl.barcodeText, {
                height: labelSize === "40x25" ? 36 : 44,
                moduleWidth: labelSize === "40x25" ? 1.2 : 1.4,
                fontSize: labelSize === "40x25" ? 9 : 10,
                showText: true,
              });

              return (
                <div
                  key={idx}
                  className={`bg-white border border-gray-300 rounded-lg p-2.5 flex flex-col justify-between shadow-xs print:shadow-none print:rounded-none print:border print:border-dashed print:border-gray-400 print:break-inside-avoid ${
                    labelSize === "50x30"
                      ? "w-[240px] h-[145px]"
                      : labelSize === "40x25"
                        ? "w-[200px] h-[120px] p-2"
                        : "w-full h-[135px]"
                  }`}
                >
                  {/* Top Bar: Store Name + Price */}
                  <div className="flex items-start justify-between gap-1">
                    {showStoreName && (
                      <span className="text-[10px] font-bold tracking-wider text-gray-500 uppercase truncate">
                        {storeName}
                      </span>
                    )}
                    {showPrice && lbl.price !== undefined && (
                      <span className="text-xs font-bold text-gray-900 ml-auto whitespace-nowrap">
                        IDR {lbl.price.toLocaleString()}
                      </span>
                    )}
                  </div>

                  {/* Product Title */}
                  <div className="text-[11px] font-semibold text-gray-900 leading-tight line-clamp-1">
                    {lbl.name}
                  </div>

                  {/* SKU & Type info */}
                  <div className="flex items-center justify-between text-[9px] text-gray-500 font-mono">
                    <span>SKU: {lbl.sku}</span>
                    <span className="font-semibold text-blue-700">{lbl.barcodeType}</span>
                  </div>

                  {/* Vector Barcode */}
                  <div
                    className="w-full flex items-center justify-center my-0.5"
                    dangerouslySetInnerHTML={{ __html: svgString }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer - Screen only */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100 bg-white print:hidden text-xs">
          <span className="text-gray-500">
            Tip: Adjust your printer paper size setting to match <strong>50mm × 30mm</strong> or <strong>A4</strong>.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-4 py-2 font-medium text-gray-600 hover:bg-gray-100"
          >
            Close
          </button>
        </div>
      </div>

      {/* Print-specific style */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-labels-area,
          #printable-labels-area * {
            visibility: visible;
          }
          #printable-labels-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>
    </div>
  );
}
