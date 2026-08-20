"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Category,
  ImeiUnit,
  Product,
  createSale,
  downloadReceiptPdf,
  fetchAvailableImeis,
  fetchCategories,
  fetchProducts,
  lookupImei,
  quoteSale,
} from "@/lib/api";
import CameraBarcodeScanner from "@/components/CameraBarcodeScanner";

interface CartItem {
  productId: number;
  sku: string;
  name: string;
  productType: string;
  qty: number;
  unitPrice: number;
  srp: number;
  discountAmount: number;
  taxAmount: number;
  lineTotal: number;
  imeis: string[];
}

interface HeldCart {
  id: string;
  savedAt: string;
  items: CartItem[];
  itemCount: number;
  subtotal: number;
}

const QUICK_DISCOUNT_PERCENTAGES = [5, 10, 15, 20];

export default function PosPage() {
  // Search & Catalog
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [quickProducts, setQuickProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  // Cart & Pricing
  const [cart, setCart] = useState<CartItem[]>([]);
  const [taxEnabled, setTaxEnabled] = useState(false); // PPN 11% Toggle
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number | null>(null);

  // Payment
  const [payMethod, setPayMethod] = useState("CASH");
  const [payAmount, setPayAmount] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saleResult, setSaleResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  // Modals & Tools
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [imeiModalItem, setImeiModalItem] = useState<CartItem | null>(null);
  const [availableImeis, setAvailableImeis] = useState<ImeiUnit[]>([]);
  const [imeiLoading, setImeiLoading] = useState(false);
  const [priceEditModal, setPriceEditModal] = useState<{
    isOpen: boolean;
    targetItem: CartItem | null;
    value: string;
  }>({
    isOpen: false,
    targetItem: null,
    value: "",
  });
  const [customDiscountModal, setCustomDiscountModal] = useState<{
    isOpen: boolean;
    targetItemId: number | null; // null means global cart discount
    type: "PERCENT" | "FIXED";
    value: string;
  }>({
    isOpen: false,
    targetItemId: null,
    type: "PERCENT",
    value: "",
  });

  // Held Carts (LocalStorage)
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [showHeldCartsModal, setShowHeldCartsModal] = useState(false);

  // Load initial catalog & categories
  useEffect(() => {
    const loadInit = async () => {
      setLoadingCatalog(true);
      try {
        const [prodRes, catRes] = await Promise.all([
          fetchProducts({ limit: 40, isActive: true }),
          fetchCategories().catch(() => ({ success: true, data: [] })),
        ]);
        setQuickProducts(prodRes.data ?? []);
        setCategories(catRes.data ?? []);
      } catch (err) {
        console.error("Failed to load POS catalog", err);
      } finally {
        setLoadingCatalog(false);
      }
    };
    loadInit();

    // Load held carts from localStorage
    try {
      const saved = localStorage.getItem("smartstore_pos_held_carts");
      if (saved) setHeldCarts(JSON.parse(saved));
    } catch {
      // ignore
    }
  }, []);

  // Search products with debounce
  useEffect(() => {
    if (search.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetchProducts({ q: search.trim(), limit: 12, isActive: true });
        setSearchResults(res.data ?? []);
      } catch {
        setSearchResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Recalculate item line totals based on discounts and tax
  const recalculateCart = useCallback(
    (items: CartItem[], applyTax: boolean, globalDiscPct: number | null) => {
      return items.map((item) => {
        const rawSubtotal = item.qty * item.unitPrice;
        let discount = item.discountAmount;

        if (globalDiscPct !== null && globalDiscPct > 0) {
          discount = Math.round((rawSubtotal * globalDiscPct) / 100);
        }

        const discountedSubtotal = Math.max(0, rawSubtotal - discount);
        const tax = applyTax ? Math.round(discountedSubtotal * 0.11) : 0;
        const lineTotal = discountedSubtotal + tax;

        return {
          ...item,
          discountAmount: discount,
          taxAmount: tax,
          lineTotal,
        };
      });
    },
    [],
  );

  // Add product to cart
  const addToCart = useCallback(
    (product: Product, prefilledImei?: string) => {
      setCart((prev) => {
        const existing = prev.find((i) => i.productId === product.id);
        const price = parseFloat(product.srp) || 0;

        let updated: CartItem[];
        if (existing) {
          updated = prev.map((i) => {
            if (i.productId === product.id) {
              const newQty = i.qty + 1;
              const newImeis = prefilledImei && !i.imeis.includes(prefilledImei)
                ? [...i.imeis, prefilledImei]
                : i.imeis;
              return {
                ...i,
                qty: newQty,
                imeis: newImeis,
              };
            }
            return i;
          });
        } else {
          const newItem: CartItem = {
            productId: product.id,
            sku: product.sku,
            name: product.name,
            productType: product.productType,
            qty: 1,
            unitPrice: price,
            srp: price,
            discountAmount: 0,
            taxAmount: 0,
            lineTotal: price,
            imeis: prefilledImei ? [prefilledImei] : [],
          };
          updated = [...prev, newItem];
        }

        return recalculateCart(updated, taxEnabled, globalDiscountPercent);
      });

      setSearch("");
      setSearchResults([]);
    },
    [recalculateCart, taxEnabled, globalDiscountPercent],
  );

  // Apply Negotiated Price on Cart Item
  const handleApplyNegotiatedPrice = () => {
    if (!priceEditModal.targetItem) return;
    const newPrice = parseFloat(priceEditModal.value) || 0;
    if (newPrice < 0) return;

    setCart((prev) =>
      recalculateCart(
        prev.map((i) => {
          if (i.productId === priceEditModal.targetItem!.productId) {
            return { ...i, unitPrice: newPrice };
          }
          return i;
        }),
        taxEnabled,
        globalDiscountPercent,
      ),
    );

    setPriceEditModal({ isOpen: false, targetItem: null, value: "" });
  };

  // Reset Item Unit Price to SRP
  const handleResetToSrp = () => {
    if (!priceEditModal.targetItem) return;
    const originalSrp = priceEditModal.targetItem.srp;

    setCart((prev) =>
      recalculateCart(
        prev.map((i) => {
          if (i.productId === priceEditModal.targetItem!.productId) {
            return { ...i, unitPrice: originalSrp };
          }
          return i;
        }),
        taxEnabled,
        globalDiscountPercent,
      ),
    );

    setPriceEditModal({ isOpen: false, targetItem: null, value: "" });
  };

  // Update item quantity
  const updateQty = (productId: number, qty: number) => {
    if (qty < 1) {
      setCart((prev) =>
        recalculateCart(
          prev.filter((i) => i.productId !== productId),
          taxEnabled,
          globalDiscountPercent,
        ),
      );
      return;
    }
    setCart((prev) =>
      recalculateCart(
        prev.map((i) => {
          if (i.productId === productId) {
            // Trim IMEIs if qty decreased below assigned IMEIs length
            const trimmedImeis = i.imeis.slice(0, qty);
            return { ...i, qty, imeis: trimmedImeis };
          }
          return i;
        }),
        taxEnabled,
        globalDiscountPercent,
      ),
    );
  };

  // Toggle PPN 11% Tax
  const handleToggleTax = () => {
    const nextState = !taxEnabled;
    setTaxEnabled(nextState);
    setCart((prev) => recalculateCart(prev, nextState, globalDiscountPercent));
  };

  // Apply Quick Global Percentage Discount
  const handleApplyGlobalDiscount = (pct: number) => {
    if (globalDiscountPercent === pct) {
      // Toggle off
      setGlobalDiscountPercent(null);
      setCart((prev) => recalculateCart(prev, taxEnabled, null));
    } else {
      setGlobalDiscountPercent(pct);
      setCart((prev) => recalculateCart(prev, taxEnabled, pct));
    }
  };

  // Clear all discounts
  const handleClearDiscounts = () => {
    setGlobalDiscountPercent(null);
    setCart((prev) =>
      recalculateCart(
        prev.map((i) => ({ ...i, discountAmount: 0 })),
        taxEnabled,
        null,
      ),
    );
  };

  // Custom Discount Application
  const handleApplyCustomDiscount = () => {
    const val = parseFloat(customDiscountModal.value) || 0;
    if (val < 0) return;

    if (customDiscountModal.targetItemId === null) {
      // Global cart discount
      if (customDiscountModal.type === "PERCENT") {
        setGlobalDiscountPercent(val);
        setCart((prev) => recalculateCart(prev, taxEnabled, val));
      } else {
        // Fixed IDR amount distributed across cart
        setGlobalDiscountPercent(null);
        const totalRaw = cart.reduce((sum, i) => sum + i.qty * i.unitPrice, 0);
        if (totalRaw > 0) {
          setCart((prev) => {
            const updated = prev.map((item) => {
              const itemRaw = item.qty * item.unitPrice;
              const ratio = itemRaw / totalRaw;
              const itemDisc = Math.round(val * ratio);
              return { ...item, discountAmount: itemDisc };
            });
            return recalculateCart(updated, taxEnabled, null);
          });
        }
      }
    } else {
      // Line item specific discount
      setGlobalDiscountPercent(null);
      setCart((prev) => {
        const updated = prev.map((item) => {
          if (item.productId === customDiscountModal.targetItemId) {
            const itemRaw = item.qty * item.unitPrice;
            const itemDisc =
              customDiscountModal.type === "PERCENT"
                ? Math.round((itemRaw * val) / 100)
                : Math.min(itemRaw, val);
            return { ...item, discountAmount: itemDisc };
          }
          return item;
        });
        return recalculateCart(updated, taxEnabled, null);
      });
    }

    setCustomDiscountModal({
      isOpen: false,
      targetItemId: null,
      type: "PERCENT",
      value: "",
    });
  };

  // Barcode / Camera Scan Handler
  const handleBarcodeScanned = async (code: string) => {
    const cleanCode = code.trim();
    if (!cleanCode) return;

    setError("");
    setSuccessMsg("");

    // 1. Try finding product by exact SKU
    try {
      const prodRes = await fetchProducts({ q: cleanCode, limit: 1 });
      const found = prodRes.data?.find(
        (p) => p.sku.toLowerCase() === cleanCode.toLowerCase(),
      );
      if (found) {
        addToCart(found);
        setSuccessMsg(`Added "${found.name}" to cart`);
        return;
      }
    } catch {
      // continue
    }

    // 2. Try looking up as an IMEI
    try {
      const imeiLookup = await lookupImei(cleanCode);
      if (imeiLookup.data?.unit) {
        const unit = imeiLookup.data.unit;
        if (unit.status !== "IN_STOCK") {
          setError(`IMEI ${cleanCode} is currently status: ${unit.status}`);
          return;
        }
        if (unit.product) {
          addToCart(unit.product, cleanCode);
          setSuccessMsg(`Added "${unit.product.name}" with IMEI ${cleanCode}`);
          return;
        }
      }
    } catch {
      // continue
    }

    setError(`No matching product or valid in-stock IMEI found for "${cleanCode}"`);
  };

  // Open IMEI Selection Modal for Cart Item
  const handleOpenImeiModal = async (item: CartItem) => {
    setImeiModalItem(item);
    setImeiLoading(true);
    try {
      const res = await fetchAvailableImeis(item.productId);
      setAvailableImeis(res.data ?? []);
    } catch {
      setAvailableImeis([]);
    } finally {
      setImeiLoading(false);
    }
  };

  // Toggle IMEI assignment for cart item
  const handleToggleImei = (imei: string) => {
    if (!imeiModalItem) return;
    const currentImeis = imeiModalItem.imeis || [];
    let updatedImeis: string[];

    if (currentImeis.includes(imei)) {
      updatedImeis = currentImeis.filter((i) => i !== imei);
    } else {
      if (currentImeis.length >= imeiModalItem.qty) {
        // Replace or notify
        updatedImeis = [...currentImeis.slice(1), imei];
      } else {
        updatedImeis = [...currentImeis, imei];
      }
    }

    setImeiModalItem((prev) => (prev ? { ...prev, imeis: updatedImeis } : null));
    setCart((prev) =>
      prev.map((i) =>
        i.productId === imeiModalItem.productId
          ? { ...i, imeis: updatedImeis }
          : i,
      ),
    );
  };

  // Hold / Suspend Cart
  const handleHoldCart = () => {
    if (cart.length === 0) return;
    const newHeldCart: HeldCart = {
      id: `HOLD-${Date.now().toString().slice(-4)}`,
      savedAt: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      items: [...cart],
      itemCount: cart.reduce((sum, i) => sum + i.qty, 0),
      subtotal: grandTotal,
    };

    const updated = [newHeldCart, ...heldCarts];
    setHeldCarts(updated);
    try {
      localStorage.setItem("smartstore_pos_held_carts", JSON.stringify(updated));
    } catch {
      // ignore
    }

    setCart([]);
    setGlobalDiscountPercent(null);
    setSuccessMsg(`Cart suspended as #${newHeldCart.id}`);
  };

  // Recall / Resume Held Cart
  const handleResumeCart = (held: HeldCart) => {
    setCart(recalculateCart(held.items, taxEnabled, null));
    const remaining = heldCarts.filter((h) => h.id !== held.id);
    setHeldCarts(remaining);
    try {
      localStorage.setItem("smartstore_pos_held_carts", JSON.stringify(remaining));
    } catch {
      // ignore
    }
    setShowHeldCartsModal(false);
    setSuccessMsg(`Resumed Cart #${held.id}`);
  };

  // Clear Cart
  const handleClearCart = () => {
    if (cart.length === 0) return;
    if (confirm("Are you sure you want to clear the current cart?")) {
      setCart([]);
      setPayAmount("");
      setGlobalDiscountPercent(null);
      setError("");
    }
  };

  // Computed Totals
  const rawSubtotal = cart.reduce((acc, i) => acc + i.qty * i.unitPrice, 0);
  const discountTotal = cart.reduce((acc, i) => acc + i.discountAmount, 0);
  const taxTotal = cart.reduce((acc, i) => acc + i.taxAmount, 0);
  const grandTotal = cart.reduce((acc, i) => acc + i.lineTotal, 0);

  const amountPaidNum = parseFloat(payAmount) || 0;
  const changeDue = Math.max(0, amountPaidNum - grandTotal);
  const isPaymentSufficient = amountPaidNum >= grandTotal && grandTotal > 0;

  // Smart Cash Tender Quick Amounts
  const cashPresets = useMemo(() => {
    if (grandTotal <= 0) return [];
    const presets = new Set<number>();
    presets.add(grandTotal); // Exact

    // Rounded up to 50k, 100k, 200k, 500k, 1M
    const denominations = [50000, 100000, 200000, 500000, 1000000];
    for (const d of denominations) {
      if (d > grandTotal) {
        presets.add(d);
      } else {
        const roundedUp = Math.ceil(grandTotal / d) * d;
        if (roundedUp > grandTotal) presets.add(roundedUp);
      }
    }
    return Array.from(presets).sort((a, b) => a - b).slice(0, 5);
  }, [grandTotal]);

  // Checkout Execution
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setError("");

    // Validate Serialized IMEI requirements
    for (const item of cart) {
      if (item.productType === "SERIALIZED") {
        if (item.imeis.length !== item.qty) {
          setError(
            `Item "${item.name}" requires exactly ${item.qty} assigned IMEI(s) (currently ${item.imeis.length} assigned)`,
          );
          return;
        }
      }
    }

    if (payMethod === "CASH" && amountPaidNum < grandTotal) {
      setError("Cash tendered is less than the grand total.");
      return;
    }

    setSubmitting(true);
    try {
      // 1. Get official server pricing & tax quote
      const quotePayload = cart.map((i) => ({
        productId: Number(i.productId),
        qty: Number(i.qty),
        unitPrice: Number(i.unitPrice),
        discountAmount: Number(i.discountAmount || 0),
        taxAmount: Number(i.taxAmount || 0),
        lineTotal: Number(i.lineTotal),
        imeis: i.imeis && i.imeis.length > 0 ? i.imeis : undefined,
      }));

      const quoteRes = await quoteSale(quotePayload);
      const quoted = quoteRes.data;

      // 2. Submit sale with server-validated totals
      const res = await createSale({
        items: quotePayload,
        subtotal: quoted ? quoted.subtotal : rawSubtotal,
        discountTotal: quoted ? quoted.discountTotal : discountTotal,
        taxTotal: quoted ? quoted.taxTotal : taxTotal,
        grandTotal: quoted ? quoted.grandTotal : grandTotal,
        payments: [
          {
            method: payMethod,
            amount: payMethod === "CASH" ? amountPaidNum : (quoted ? quoted.grandTotal : grandTotal),
          },
        ],
      });

      setSaleResult(res.data);
      setCart([]);
      setPayAmount("");
      setGlobalDiscountPercent(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Filter Quick Products by Category Tab
  const filteredQuickProducts = useMemo(() => {
    if (selectedCategory === "ALL") return quickProducts;
    return quickProducts.filter((p) => String(p.categoryId) === selectedCategory);
  }, [quickProducts, selectedCategory]);

  // Completed Sale Screen
  if (saleResult) {
    return (
      <div className="max-w-lg mx-auto mt-8 text-center">
        <div className="rounded-2xl bg-white p-6 sm:p-8 shadow-xl border border-gray-200">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-3xl mx-auto mb-4">
            ✓
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">
            Transaction Complete!
          </h2>
          <p className="font-mono text-sm text-blue-600 font-semibold mb-4">
            Invoice: {saleResult.invoiceNumber}
          </p>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 text-left text-xs space-y-2">
            <div className="flex justify-between text-gray-600">
              <span>Grand Total:</span>
              <span className="font-bold text-gray-900 font-mono text-sm">
                IDR {parseFloat(saleResult.grandTotal || "0").toLocaleString()}
              </span>
            </div>
            {payMethod === "CASH" && (
              <>
                <div className="flex justify-between text-gray-600">
                  <span>Cash Paid:</span>
                  <span className="font-mono font-medium text-gray-800">
                    IDR {amountPaidNum.toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-emerald-700 font-bold border-t border-slate-200 pt-2 text-sm">
                  <span>Kembalian / Change:</span>
                  <span className="font-mono">
                    IDR {changeDue.toLocaleString()}
                  </span>
                </div>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => downloadReceiptPdf(saleResult.id)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gray-100 px-4 py-3 text-xs font-bold text-gray-800 hover:bg-gray-200 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              <span>Print PDF Receipt</span>
            </button>

            <button
              type="button"
              onClick={() => setSaleResult(null)}
              className="rounded-xl bg-blue-600 px-4 py-3 text-xs font-bold text-white hover:bg-blue-700 shadow-md transition-colors"
            >
              Start New Sale (F2)
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Banner & Quick Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Point of Sale (POS)
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Rapid retail billing, barcode intake, instant discounts, and cash tender handling.
          </p>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-2">
          {heldCarts.length > 0 && (
            <button
              type="button"
              onClick={() => setShowHeldCartsModal(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>Recall Cart ({heldCarts.length})</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsScannerOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Scan with Phone / Cam</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-lg bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800 border border-emerald-200 flex items-center justify-between">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="font-bold text-emerald-600 hover:text-emerald-800">
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-rose-50 px-4 py-2.5 text-xs text-rose-700 border border-rose-200 flex items-center justify-between">
          <span>{error}</span>
          <button onClick={() => setError("")} className="font-bold text-rose-600 hover:text-rose-800">
            &times;
          </button>
        </div>
      )}

      {/* Main POS Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Side: Product Search, Category Tabs, Quick Grid (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Quick Search & Barcode Scan Input */}
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && search.trim()) {
                  e.preventDefault();
                  handleBarcodeScanned(search.trim());
                }
              }}
              placeholder="Search product SKU, name, or scan barcode / IMEI..."
              className="w-full pl-11 pr-4 py-3 rounded-xl border border-gray-300 bg-white text-sm shadow-2xs focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 focus:outline-none"
              autoFocus
            />

            {/* Dropdown Live Results */}
            {searchResults.length > 0 && (
              <div className="absolute z-20 mt-1 w-full rounded-xl border border-gray-200 bg-white shadow-xl max-h-72 overflow-y-auto divide-y divide-gray-100">
                {searchResults.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => addToCart(p)}
                    className="w-full px-4 py-2.5 text-left hover:bg-blue-50/80 flex items-center justify-between transition-colors"
                  >
                    <div>
                      <p className="font-semibold text-xs text-gray-900">{p.name}</p>
                      <p className="font-mono text-[11px] text-gray-500">
                        {p.sku} &bull; {p.productType}
                      </p>
                    </div>
                    <span className="font-mono font-bold text-xs text-blue-700">
                      SRP: IDR {parseFloat(p.srp).toLocaleString()}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Category Tabs Bar */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
                selectedCategory === "ALL"
                  ? "bg-slate-900 text-white shadow-xs"
                  : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              All Items
            </button>
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setSelectedCategory(String(c.id))}
                className={`px-3 py-1.5 rounded-lg font-semibold shrink-0 transition-colors ${
                  selectedCategory === String(c.id)
                    ? "bg-blue-600 text-white shadow-xs"
                    : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200"
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {/* Quick Product Cards Grid (Functional POS Speed-Keys) */}
          <div className="rounded-xl bg-slate-50 p-3.5 border border-gray-200">
            <div className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2.5 flex items-center justify-between">
              <span>⚡ Quick Item Speed-Keys</span>
              <span>{filteredQuickProducts.length} available</span>
            </div>

            {loadingCatalog ? (
              <div className="py-12 text-center text-xs text-gray-400">
                Loading speed-keys...
              </div>
            ) : filteredQuickProducts.length === 0 ? (
              <div className="py-12 text-center text-xs text-gray-400">
                No active products in this category.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5 max-h-[460px] overflow-y-auto pr-1">
                {filteredQuickProducts.map((p) => {
                  const isSerialized = p.productType === "SERIALIZED";
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => addToCart(p)}
                      className="rounded-xl bg-white p-3 border border-gray-200 text-left hover:border-blue-500 hover:shadow-md transition-all flex flex-col justify-between group"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-[10px] text-gray-400 group-hover:text-blue-600 font-semibold truncate">
                            {p.sku}
                          </span>
                          {isSerialized && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-purple-50 text-purple-700 font-bold border border-purple-200">
                              IMEI
                            </span>
                          )}
                        </div>
                        <h4 className="font-semibold text-xs text-gray-900 line-clamp-2 leading-tight">
                          {p.name}
                        </h4>
                      </div>

                      <div className="mt-2.5 pt-1.5 border-t border-gray-100 flex items-center justify-between font-mono text-xs">
                        <span className="text-[10px] text-gray-400 font-sans font-medium">SRP</span>
                        <span className="font-bold text-blue-700">IDR {parseFloat(p.srp).toLocaleString()}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Cart, Discounts, Tax, Payment (5 Cols) */}
        <div className="lg:col-span-5 space-y-3">
          <div className="rounded-2xl bg-white shadow-md border border-gray-200 overflow-hidden flex flex-col">
            {/* Cart Header & Actions */}
            <div className="px-4 py-3 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Cart</span>
                <span className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded-full text-xs font-mono">
                  {cart.length} item(s)
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={handleHoldCart}
                  disabled={cart.length === 0}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium disabled:opacity-40"
                  title="Suspend Cart"
                >
                  Hold
                </button>
                <button
                  type="button"
                  onClick={handleClearCart}
                  disabled={cart.length === 0}
                  className="px-2 py-1 rounded bg-rose-900/60 hover:bg-rose-800 text-rose-200 font-medium disabled:opacity-40"
                  title="Empty Cart"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Cart Items List */}
            <div className="max-h-60 overflow-y-auto divide-y divide-gray-100 p-2">
              {cart.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400">
                  Cart is empty. Tap speed-keys or scan barcode to begin.
                </div>
              ) : (
                cart.map((item) => {
                  const isSerialized = item.productType === "SERIALIZED";
                  const imeiAssignedCount = item.imeis?.length || 0;
                  const imeiReady = !isSerialized || imeiAssignedCount === item.qty;
                  const isNegotiated = item.srp > 0 && item.unitPrice !== item.srp;

                  return (
                    <div key={item.productId} className="p-2.5 rounded-lg hover:bg-gray-50/80 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-semibold text-xs text-gray-900">
                            {item.name}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            <span className="font-mono text-xs font-bold text-gray-900">
                              IDR {item.unitPrice.toLocaleString()}
                            </span>
                            {isNegotiated && (
                              <span className="font-mono text-[10px] text-gray-400 line-through">
                                SRP: {item.srp.toLocaleString()}
                              </span>
                            )}
                            <span className="text-[10px] text-gray-400">&bull; {item.sku}</span>
                          </div>
                        </div>

                        {/* Qty Stepper */}
                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateQty(item.productId, item.qty - 1)}
                            className="w-6 h-6 rounded bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 flex items-center justify-center"
                          >
                            -
                          </button>
                          <span className="w-6 text-center font-bold text-xs font-mono">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.productId, item.qty + 1)}
                            className="w-6 h-6 rounded bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 flex items-center justify-center"
                          >
                            +
                          </button>
                          <button
                            type="button"
                            onClick={() => updateQty(item.productId, 0)}
                            className="text-gray-400 hover:text-red-600 font-bold text-sm ml-1"
                          >
                            &times;
                          </button>
                        </div>
                      </div>

                      {/* Item Action Buttons (Price Negotiation, Discounts, IMEI) */}
                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <div className="flex items-center gap-2">
                          {isSerialized && (
                            <button
                              type="button"
                              onClick={() => handleOpenImeiModal(item)}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded font-bold ${
                                imeiReady
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200 animate-pulse"
                              }`}
                            >
                              <span>IMEI: {imeiAssignedCount}/{item.qty} assigned</span>
                              <span>⚙️</span>
                            </button>
                          )}
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setPriceEditModal({
                                isOpen: true,
                                targetItem: item,
                                value: String(item.unitPrice),
                              })
                            }
                            className={`font-semibold px-1.5 py-0.5 rounded border transition-colors ${
                              isNegotiated
                                ? "bg-amber-50 text-amber-800 border-amber-300"
                                : "text-blue-600 hover:text-blue-800 bg-blue-50 border-blue-200"
                            }`}
                            title="Edit negotiated unit price"
                          >
                            {isNegotiated ? "✏️ Negotiated" : "✏️ Edit Price"}
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setCustomDiscountModal({
                                isOpen: true,
                                targetItemId: item.productId,
                                type: "PERCENT",
                                value: "",
                              })
                            }
                            className="text-blue-600 hover:underline font-semibold"
                          >
                            + Discount
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Quick Discount Keys Bar */}
            <div className="px-3.5 py-2.5 bg-slate-50 border-t border-gray-200 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
                <span>Discount Shortcuts:</span>
                {globalDiscountPercent !== null && (
                  <button
                    type="button"
                    onClick={handleClearDiscounts}
                    className="text-red-500 hover:underline font-bold text-[10px]"
                  >
                    Clear All
                  </button>
                )}
              </div>

              <div className="grid grid-cols-5 gap-1.5">
                {QUICK_DISCOUNT_PERCENTAGES.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => handleApplyGlobalDiscount(pct)}
                    className={`py-1 rounded text-xs font-bold transition-colors ${
                      globalDiscountPercent === pct
                        ? "bg-rose-600 text-white shadow-xs"
                        : "bg-white text-gray-700 hover:bg-rose-50 border border-gray-300"
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() =>
                    setCustomDiscountModal({
                      isOpen: true,
                      targetItemId: null,
                      type: "PERCENT",
                      value: "",
                    })
                  }
                  className="py-1 rounded text-xs font-bold bg-white text-blue-700 border border-blue-300 hover:bg-blue-50"
                >
                  Custom
                </button>
              </div>
            </div>

            {/* Totals & Tax Box */}
            <div className="px-4 py-3 border-t border-gray-200 bg-white space-y-1.5 text-xs">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span className="font-mono">IDR {rawSubtotal.toLocaleString()}</span>
              </div>

              {discountTotal > 0 && (
                <div className="flex justify-between text-rose-600 font-semibold">
                  <span>
                    Discount {globalDiscountPercent ? `(${globalDiscountPercent}%)` : ""}:
                  </span>
                  <span className="font-mono">-IDR {discountTotal.toLocaleString()}</span>
                </div>
              )}

              {/* Tax Toggle */}
              <div className="flex items-center justify-between text-gray-600 py-0.5">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxEnabled}
                    onChange={handleToggleTax}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                  />
                  <span className="text-xs font-medium">PPN 11% (VAT)</span>
                </label>
                <span className="font-mono">IDR {taxTotal.toLocaleString()}</span>
              </div>

              <div className="flex justify-between text-base font-black text-slate-900 border-t-2 border-slate-900 pt-2">
                <span>Grand Total</span>
                <span className="font-mono text-blue-700">
                  IDR {grandTotal.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Payment & Cash Tender Shortcuts */}
            <div className="p-4 bg-slate-50 border-t border-gray-200 space-y-3">
              {/* Payment Method Selector */}
              <div className="grid grid-cols-3 gap-1.5 text-xs font-bold">
                {["CASH", "BANK_TRANSFER", "E_WALLET"].map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => {
                      setPayMethod(m);
                      if (m !== "CASH") setPayAmount(String(grandTotal));
                    }}
                    className={`py-1.5 rounded-lg border transition-colors ${
                      payMethod === m
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-white text-gray-700 border-gray-300 hover:bg-gray-100"
                    }`}
                  >
                    {m === "CASH" ? "💵 Cash" : m === "BANK_TRANSFER" ? "🏦 Transfer" : "📱 QRIS / E-Pay"}
                  </button>
                ))}
              </div>

              {/* Cash Tender Input & Speed-Keys */}
              {payMethod === "CASH" && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-[10px] font-bold text-gray-600 uppercase mb-1">
                      Cash Tendered (IDR):
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="1000"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      placeholder={grandTotal > 0 ? String(grandTotal) : "0"}
                      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-right font-bold bg-white focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  {/* Cash Tender Quick Preset Buttons */}
                  <div className="flex flex-wrap gap-1">
                    {cashPresets.map((amt) => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setPayAmount(String(amt))}
                        className="px-2 py-1 rounded bg-white text-[11px] font-mono font-bold text-slate-800 border border-slate-300 hover:bg-blue-50 hover:border-blue-400"
                      >
                        {amt === grandTotal ? "Exact" : `IDR ${amt.toLocaleString()}`}
                      </button>
                    ))}
                  </div>

                  {/* Change Due Display */}
                  {amountPaidNum > 0 && (
                    <div className="p-2.5 rounded-lg bg-white border border-gray-200 flex justify-between items-center text-xs">
                      <span className="font-semibold text-gray-600">Kembalian / Change:</span>
                      <span
                        className={`font-mono font-black text-sm ${
                          isPaymentSufficient ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {isPaymentSufficient
                          ? `IDR ${changeDue.toLocaleString()}`
                          : `Kurang IDR ${(grandTotal - amountPaidNum).toLocaleString()}`}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Checkout Button */}
              <button
                type="button"
                onClick={handleCheckout}
                disabled={cart.length === 0 || submitting || (payMethod === "CASH" && !isPaymentSufficient)}
                className="w-full rounded-xl bg-emerald-600 px-4 py-3.5 text-sm font-bold text-white shadow-md hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Processing Sale...</span>
                  </>
                ) : (
                  <>
                    <span>Complete Checkout & Print (Enter)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Camera Barcode Scanner Modal */}
      {isScannerOpen && (
        <CameraBarcodeScanner
          isOpen={true}
          onClose={() => setIsScannerOpen(false)}
          onScan={(code) => {
            handleBarcodeScanned(code);
            setIsScannerOpen(false);
          }}
          title="Scan Product Barcode or Phone IMEI"
          subtitle="Point camera at barcode or smartphone packaging"
        />
      )}

      {/* Serialized IMEI Selection Modal */}
      {imeiModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
              <div>
                <h3 className="text-sm font-bold text-gray-900">
                  Assign IMEI Serials
                </h3>
                <p className="text-xs text-gray-500 font-mono">{imeiModalItem.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setImeiModalItem(null)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="text-xs text-gray-600 mb-3">
              Select <strong>{imeiModalItem.qty}</strong> IMEI unit(s) for checkout:
            </div>

            {imeiLoading ? (
              <div className="py-8 text-center text-xs text-gray-400">
                Loading available in-stock IMEIs...
              </div>
            ) : availableImeis.length === 0 ? (
              <div className="py-8 text-center text-xs text-rose-500 bg-rose-50 rounded-lg p-3">
                No available in-stock IMEIs found for this product. Please intake via Goods Receipts first.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-56 overflow-y-auto mb-4">
                {availableImeis.map((unit) => {
                  const isSelected = (imeiModalItem.imeis || []).includes(unit.imei);
                  return (
                    <button
                      key={unit.id}
                      type="button"
                      onClick={() => handleToggleImei(unit.imei)}
                      className={`w-full p-2.5 rounded-lg border text-left text-xs font-mono flex items-center justify-between transition-colors ${
                        isSelected
                          ? "bg-emerald-50 border-emerald-300 text-emerald-900 font-bold"
                          : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{unit.imei}</span>
                        {unit.conditionGrade && (
                          <span className="text-[10px] font-sans font-semibold px-1.5 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200">
                            {unit.conditionGrade}
                          </span>
                        )}
                        {unit.batteryHealth != null && (
                          <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {unit.batteryHealth}% BH
                          </span>
                        )}
                      </div>
                      <span>{isSelected ? "✓ Assigned" : "+ Select"}</span>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setImeiModalItem(null)}
                className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Discount Modal */}
      {customDiscountModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-gray-200">
            <h3 className="text-sm font-bold text-gray-900 mb-1">
              Apply Custom Discount
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              {customDiscountModal.targetItemId
                ? "Discount on selected item"
                : "Discount distributed across entire cart"}
            </p>

            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs font-bold">
                <button
                  type="button"
                  onClick={() =>
                    setCustomDiscountModal((prev) => ({ ...prev, type: "PERCENT" }))
                  }
                  className={`py-1.5 rounded-lg border ${
                    customDiscountModal.type === "PERCENT"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  Percentage (%)
                </button>
                <button
                  type="button"
                  onClick={() =>
                    setCustomDiscountModal((prev) => ({ ...prev, type: "FIXED" }))
                  }
                  className={`py-1.5 rounded-lg border ${
                    customDiscountModal.type === "FIXED"
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-white text-gray-700 border-gray-300"
                  }`}
                >
                  Nominal (IDR)
                </button>
              </div>

              <div>
                <input
                  type="number"
                  min={0}
                  autoFocus
                  placeholder={customDiscountModal.type === "PERCENT" ? "e.g. 10" : "e.g. 25000"}
                  value={customDiscountModal.value}
                  onChange={(e) =>
                    setCustomDiscountModal((prev) => ({ ...prev, value: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-right font-bold focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() =>
                    setCustomDiscountModal({
                      isOpen: false,
                      targetItemId: null,
                      type: "PERCENT",
                      value: "",
                    })
                  }
                  className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleApplyCustomDiscount}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                >
                  Apply Discount
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Negotiate Unit Price Modal */}
      {priceEditModal.isOpen && priceEditModal.targetItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl border border-gray-200">
            <h3 className="text-sm font-bold text-gray-900 mb-0.5">
              Negotiate Unit Price
            </h3>
            <p className="text-xs text-gray-500 mb-3">
              {priceEditModal.targetItem.name} &bull; {priceEditModal.targetItem.sku}
            </p>

            <div className="space-y-3">
              <div className="rounded-lg bg-slate-50 p-2.5 border border-slate-200 text-xs flex items-center justify-between">
                <span className="text-gray-500">Suggested Retail Price (SRP):</span>
                <span className="font-mono font-bold text-gray-700">
                  IDR {priceEditModal.targetItem.srp.toLocaleString()}
                </span>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-600 uppercase mb-1">
                  Actual Negotiated Amount (IDR)
                </label>
                <input
                  type="number"
                  min={0}
                  step="1000"
                  autoFocus
                  placeholder="0"
                  value={priceEditModal.value}
                  onChange={(e) =>
                    setPriceEditModal((prev) => ({ ...prev, value: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono text-right font-bold text-blue-700 focus:border-blue-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleResetToSrp}
                  className="text-xs text-gray-500 hover:text-gray-700 underline font-medium"
                >
                  Reset to SRP
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      setPriceEditModal({ isOpen: false, targetItem: null, value: "" })
                    }
                    className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleApplyNegotiatedPrice}
                    className="px-4 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
                  >
                    Set Price
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Held Carts Recall Modal */}
      {showHeldCartsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl border border-gray-200">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 mb-3">
              <h3 className="text-sm font-bold text-gray-900">
                Suspended / Held Carts
              </h3>
              <button
                type="button"
                onClick={() => setShowHeldCartsModal(false)}
                className="text-gray-400 hover:text-gray-600 font-bold text-lg"
              >
                &times;
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
              {heldCarts.map((held) => (
                <div
                  key={held.id}
                  className="p-3 rounded-xl border border-gray-200 bg-gray-50 flex items-center justify-between"
                >
                  <div>
                    <span className="font-bold text-xs text-gray-900">{held.id}</span>
                    <span className="text-[11px] text-gray-500 ml-2">at {held.savedAt}</span>
                    <div className="text-xs text-gray-600 mt-0.5">
                      {held.itemCount} items &bull; IDR {held.subtotal.toLocaleString()}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleResumeCart(held)}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-bold text-xs hover:bg-blue-700"
                  >
                    Resume
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}