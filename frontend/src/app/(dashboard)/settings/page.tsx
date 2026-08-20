"use client";

import { useEffect, useState } from "react";
import { fetchSettings, updateSettings } from "@/lib/api";

export default function SettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Store & Business Info
  const [storeName, setStoreName] = useState("");
  const [storeAddress, setStoreAddress] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [currencyCode, setCurrencyCode] = useState("IDR");

  // POS & Receipt Formatting
  const [receiptPrefix, setReceiptPrefix] = useState("INV");
  const [receiptFooter, setReceiptFooter] = useState("");

  // Tax & Discounts
  const [taxMode, setTaxMode] = useState("EXCLUSIVE");
  const [taxDefaultRate, setTaxDefaultRate] = useState("11.00");
  const [maxDiscountCashier, setMaxDiscountCashier] = useState("20");
  const [returnWindowDays, setReturnWindowDays] = useState("7");

  // Security
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState("60");

  const loadSettings = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetchSettings();
      const s = res.data || {};

      setStoreName(s.STORE_NAME || "SmartStore Mobile & Retail");
      setStoreAddress(s.STORE_ADDRESS || "Jl. Sudirman No. 88, Jakarta Selatan");
      setStorePhone(s.STORE_PHONE || "+62 812-3456-7890");
      setCurrencyCode(s.CURRENCY_CODE || "IDR");

      setReceiptPrefix(s.RECEIPT_PREFIX || "INV");
      setReceiptFooter(s.RECEIPT_FOOTER || "Thank you for shopping with us! Please keep this receipt for warranty claims.");

      setTaxMode(s.TAX_MODE || "EXCLUSIVE");
      setTaxDefaultRate(s.TAX_DEFAULT_RATE || "11.00");
      setMaxDiscountCashier(s.MAX_DISCOUNT_PERCENT_CASHIER || "20");
      setReturnWindowDays(s.RETURN_WINDOW_DAYS || "7");

      setSessionTimeoutMinutes(s.SESSION_TIMEOUT_MINUTES || "60");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load store settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSuccess("");
    setError("");

    const payload = [
      { key: "STORE_NAME", value: storeName.trim() },
      { key: "STORE_ADDRESS", value: storeAddress.trim() },
      { key: "STORE_PHONE", value: storePhone.trim() },
      { key: "CURRENCY_CODE", value: currencyCode.trim() },
      { key: "RECEIPT_PREFIX", value: receiptPrefix.trim() },
      { key: "RECEIPT_FOOTER", value: receiptFooter.trim() },
      { key: "TAX_MODE", value: taxMode },
      { key: "TAX_DEFAULT_RATE", value: String(parseFloat(taxDefaultRate) || 0) },
      { key: "MAX_DISCOUNT_PERCENT_CASHIER", value: String(parseInt(maxDiscountCashier) || 0) },
      { key: "RETURN_WINDOW_DAYS", value: String(parseInt(returnWindowDays) || 0) },
      { key: "SESSION_TIMEOUT_MINUTES", value: String(parseInt(sessionTimeoutMinutes) || 60) },
    ];

    try {
      await updateSettings(payload);
      setSuccess("Store settings and configuration updated successfully!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-24 text-center text-gray-500">
        <div className="inline-block w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
        <p className="text-sm">Loading system settings...</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Store & System Settings
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your store business profile, POS receipt templates, tax rules, and policies.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSaveAll}
          disabled={saving}
          className="inline-flex items-center justify-center rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              <span>Saving...</span>
            </>
          ) : (
            <span>Save All Changes</span>
          )}
        </button>
      </div>

      {/* Notifications */}
      {success && (
        <div className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800 border border-emerald-200 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="font-medium">{success}</span>
          </div>
          <button onClick={() => setSuccess("")} className="font-bold text-emerald-600 hover:text-emerald-800">
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-50 p-4 text-sm text-rose-700 border border-rose-200 flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium">{error}</span>
          </div>
          <button onClick={() => setError("")} className="font-bold text-rose-600 hover:text-rose-800">
            &times;
          </button>
        </div>
      )}

      <form onSubmit={handleSaveAll} className="space-y-6">
        {/* Section 1: Store Business Profile */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>🏪</span>
              <span>Store & Business Profile</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              These details appear on sales invoices, receipts, and Purchase Order letterheads.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Store Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Phone / WhatsApp Support
              </label>
              <input
                type="text"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Store Physical Address
              </label>
              <textarea
                rows={2}
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Currency Code
              </label>
              <select
                value={currencyCode}
                onChange={(e) => setCurrencyCode(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none font-mono"
              >
                <option value="IDR">IDR (Indonesian Rupiah)</option>
                <option value="USD">USD (US Dollar)</option>
                <option value="SGD">SGD (Singapore Dollar)</option>
                <option value="MYR">MYR (Malaysian Ringgit)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: POS Receipt & Print Customization */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>🧾</span>
              <span>POS Invoice & Receipt Configuration</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Customize numbering prefixes and receipt print text for customer receipts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Invoice Number Prefix
              </label>
              <input
                type="text"
                required
                value={receiptPrefix}
                onChange={(e) => setReceiptPrefix(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-mono font-bold focus:border-blue-500 focus:outline-none"
              />
              <p className="text-[11px] text-gray-400 mt-1">Example generated: {receiptPrefix}-20260820-0001</p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Thermal Receipt Footer Message
              </label>
              <textarea
                rows={2}
                value={receiptFooter}
                onChange={(e) => setReceiptFooter(e.target.value)}
                placeholder="Thank you for your purchase!"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Tax, Discount, and Policy Rules */}
        <div className="rounded-2xl bg-white p-6 shadow-sm border border-gray-200 space-y-4">
          <div className="border-b border-gray-100 pb-3">
            <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
              <span>📊</span>
              <span>Tax & Retail Discount Policies</span>
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Configure VAT mode, default rates, return timeframes, and cashier limits.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Tax Calculation Mode
              </label>
              <select
                value={taxMode}
                onChange={(e) => setTaxMode(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm bg-white focus:border-blue-500 focus:outline-none"
              >
                <option value="EXCLUSIVE">EXCLUSIVE (Added at Checkout)</option>
                <option value="INCLUSIVE">INCLUSIVE (Included in Price)</option>
                <option value="NONE">NONE (Non-taxable / Exempt)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Default PPN / Tax Rate (%)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={taxDefaultRate}
                onChange={(e) => setTaxDefaultRate(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Max Cashier Discount Limit (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={maxDiscountCashier}
                onChange={(e) => setMaxDiscountCashier(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Customer Return Window (Days)
              </label>
              <input
                type="number"
                min="0"
                max="365"
                value={returnWindowDays}
                onChange={(e) => setReturnWindowDays(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 uppercase mb-1">
                Session Idle Timeout (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="1440"
                value={sessionTimeoutMinutes}
                onChange={(e) => setSessionTimeoutMinutes(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2 text-sm font-mono focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Action Bottom Bar */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-xl bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center gap-2"
          >
            {saving ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving Changes...</span>
              </>
            ) : (
              <span>Save All Settings</span>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
