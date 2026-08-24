"use client";

import { useEffect, useMemo, useState } from "react";
import {
  createSale,
  fetchCategories,
  fetchCurrentShift,
  fetchProducts,
  fetchSaleReceipt,
  generateIdempotencyKey,
  lookupImei,
  Product,
  quoteSale,
  ReceiptPayload,
} from "@/lib/api";
import { useCache } from "@/lib/use-cache";
import CameraBarcodeScanner from "@/components/CameraBarcodeScanner";
import PrintReceiptModal from "@/components/PrintReceiptModal";
import ShiftStatusModal from "@/components/ShiftStatusModal";

import { usePosCart } from "./hooks/usePosCart";
import { useHeldCarts } from "./hooks/useHeldCarts";
import { useOfflinePos } from "./hooks/useOfflinePos";
import { CartItem, SplitPaymentLine } from "./types";

import PosOfflineSyncBanner from "./components/PosOfflineSyncBanner";
import PosProductCatalog from "./components/PosProductCatalog";
import PosCartTable from "./components/PosCartTable";
import PosPaymentPanel from "./components/PosPaymentPanel";
import PosCompletedSale from "./components/PosCompletedSale";
import PosImeiPickerModal from "./components/PosImeiPickerModal";
import PosPriceEditModal from "./components/PosPriceEditModal";
import PosDiscountModal from "./components/PosDiscountModal";
import PosHeldCartsModal from "./components/PosHeldCartsModal";

export default function PosPage() {
  // 1. Smart Caching Layer (Products, Categories, Active Shift)
  const {
    data: rawProducts = [],
    loading: productsLoading,
  } = useCache("pos_products", () => fetchProducts({ limit: 80, isActive: true }), {
    ttlMs: 60000,
    persistKey: "pos_products",
  });

  const products: Product[] = useMemo(() => {
    const list = (rawProducts as any)?.data ?? rawProducts ?? [];
    return Array.isArray(list) ? list : [];
  }, [rawProducts]);

  const { data: categories = [] } = useCache(
    "pos_categories",
    () => fetchCategories(),
    { ttlMs: 300000, persistKey: "pos_categories" },
  );

  const {
    data: currentShift,
    mutate: mutateShift,
    revalidate: revalidateShift,
  } = useCache("pos_current_shift", () => fetchCurrentShift(), {
    ttlMs: 15000,
  });

  // 2. Custom Hooks
  const cartHook = usePosCart();
  const heldCartsHook = useHeldCarts();
  const offlineHook = useOfflinePos();

  // 3. Modals & Local State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const [saleResult, setSaleResult] = useState<any>(null);
  const [receiptPayload, setReceiptPayload] = useState<ReceiptPayload | null>(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isShiftModalOpen, setIsShiftModalOpen] = useState(false);
  const [imeiModalItem, setImeiModalItem] = useState<CartItem | null>(null);
  const [priceModalItem, setPriceModalItem] = useState<CartItem | null>(null);
  const [discountModalItem, setDiscountModalItem] = useState<CartItem | null>(null);
  const [isCustomGlobalDiscountOpen, setIsCustomGlobalDiscountOpen] = useState(false);

  // Barcode Scan Handler
  const handleBarcodeScanned = async (barcode: string) => {
    const clean = barcode.trim();
    if (!clean) return;

    // 1. Direct SKU match in cached catalog
    const matchedProduct = products.find(
      (p) => p.sku.toLowerCase() === clean.toLowerCase(),
    );

    if (matchedProduct) {
      cartHook.addToCart(matchedProduct);
      setSuccessMsg(`Added "${matchedProduct.name}" to cart.`);
      setTimeout(() => setSuccessMsg(""), 2500);
      return;
    }

    // 2. Remote IMEI Lookup if not found as direct SKU
    try {
      const imeiRes = await lookupImei(clean);
      const unit = imeiRes.data?.unit;
      if (unit && unit.product) {
        cartHook.addToCart(unit.product, unit.imei);
        setSuccessMsg(`Scanned IMEI for "${unit.product.name}".`);
        setTimeout(() => setSuccessMsg(""), 2500);
      } else {
        setError(`Barcode / IMEI "${clean}" not recognized.`);
      }
    } catch {
      setError(`Barcode "${clean}" not found.`);
    }
  };

  // Keyboard Shortcuts (F2: New Sale)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "F2") {
        e.preventDefault();
        setSaleResult(null);
        setReceiptPayload(null);
        cartHook.clearCart();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [cartHook]);

  // Checkout Handler
  const handleCheckout = async (
    isSplit: boolean,
    singleMethod: string,
    singleAmount: number,
    splitLines: SplitPaymentLine[],
  ) => {
    if (cartHook.cart.length === 0) return;
    setError("");

    // Validate shift
    if (!currentShift) {
      setError("No register shift is currently open. Please open a shift first.");
      setIsShiftModalOpen(true);
      return;
    }

    // Validate Serialized IMEI assignments
    for (const item of cartHook.cart) {
      if (item.productType === "SERIALIZED") {
        if (item.imeis.length !== item.qty) {
          setError(
            `Item "${item.name}" requires exactly ${item.qty} assigned IMEI(s) (currently ${item.imeis.length} assigned)`,
          );
          setImeiModalItem(item);
          return;
        }
      }
    }

    // Build Payments Array
    let payments: SplitPaymentLine[] = [];
    if (!isSplit) {
      payments = [{ id: "1", method: singleMethod, amount: singleAmount }];
    } else {
      payments = splitLines;
    }

    setSubmitting(true);

    // If offline, queue transaction locally
    if (!offlineHook.isOnline) {
      const offlineRes = offlineHook.queueOfflineSale(
        cartHook.cart,
        {
          rawSubtotal: cartHook.rawSubtotal,
          discountTotal: cartHook.discountTotal,
          taxTotal: cartHook.taxTotal,
          grandTotal: cartHook.grandTotal,
        },
        payments,
        currentShift.user?.fullName ?? "Cashier",
        currentShift.id,
      );

      setSaleResult(offlineRes.saleResult);
      setReceiptPayload(offlineRes.receiptPayload);
      cartHook.clearCart();
      setSubmitting(false);
      return;
    }

    // Online Checkout Execution
    try {
      // 1. Get official server pricing & tax quote
      const quotePayload = cartHook.cart.map((i) => ({
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

      // 2. Submit sale with idempotency key
      const res = await createSale({
        items: quotePayload,
        subtotal: quoted ? quoted.subtotal : cartHook.rawSubtotal,
        discountTotal: quoted ? quoted.discountTotal : cartHook.discountTotal,
        taxTotal: quoted ? quoted.taxTotal : cartHook.taxTotal,
        grandTotal: quoted ? quoted.grandTotal : cartHook.grandTotal,
        payments: payments.map((p) => ({
          method: p.method,
          amount: p.amount,
          referenceNo: p.referenceNo,
        })),
        idempotencyKey: generateIdempotencyKey(),
        shiftId: currentShift?.id,
      });

      setSaleResult(res.data);
      cartHook.clearCart();
      revalidateShift(); // Revalidate shift totals

      // Preload thermal receipt
      try {
        const rc = await fetchSaleReceipt(res.data.id);
        setReceiptPayload(rc.data);
      } catch {
        // non-blocking
      }
    } catch (err: any) {
      // Network drop fallback
      if (err?.message?.includes("Failed to fetch") || !navigator.onLine) {
        const offlineRes = offlineHook.queueOfflineSale(
          cartHook.cart,
          {
            rawSubtotal: cartHook.rawSubtotal,
            discountTotal: cartHook.discountTotal,
            taxTotal: cartHook.taxTotal,
            grandTotal: cartHook.grandTotal,
          },
          payments,
          currentShift.user?.fullName ?? "Cashier",
          currentShift.id,
        );

        setSaleResult(offlineRes.saleResult);
        setReceiptPayload(offlineRes.receiptPayload);
        cartHook.clearCart();
      } else {
        setError(err instanceof Error ? err.message : "Checkout failed");
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Completed Sale View
  if (saleResult) {
    return (
      <>
        <PosCompletedSale
          saleResult={saleResult}
          onPrintReceipt={() => setShowReceiptModal(true)}
          onNewSale={() => {
            setSaleResult(null);
            setReceiptPayload(null);
          }}
        />

        <PrintReceiptModal
          isOpen={showReceiptModal}
          onClose={() => setShowReceiptModal(false)}
          receipt={receiptPayload}
        />
      </>
    );
  }

  return (
    <div className="space-y-4">
      {/* Offline Status & Background Sync Banner */}
      <PosOfflineSyncBanner
        isOnline={offlineHook.isOnline}
        pendingSyncCount={offlineHook.pendingSyncCount}
        isSyncing={offlineHook.isSyncing}
        syncStatusMsg={offlineHook.syncStatusMsg}
        onSyncNow={offlineHook.syncOfflineSales}
      />

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

        <div className="flex items-center gap-2">
          {/* Shift Status Button */}
          <button
            type="button"
            onClick={() => setIsShiftModalOpen(true)}
            className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-xs font-bold border transition-colors shadow-2xs ${
              currentShift
                ? "bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100"
                : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 animate-pulse"
            }`}
          >
            <span
              className={`flex h-2 w-2 rounded-full ${
                currentShift ? "bg-emerald-500" : "bg-amber-500"
              }`}
            ></span>
            <span>
              {currentShift
                ? `${currentShift.registerName} • Shift #${currentShift.id}`
                : "⚠️ Open Register Shift"}
            </span>
          </button>

          {/* Held Carts Recall */}
          {heldCartsHook.heldCarts.length > 0 && (
            <button
              type="button"
              onClick={() => heldCartsHook.setShowHeldCartsModal(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-amber-50 px-3.5 py-2 text-xs font-bold text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse"></span>
              <span>Recall Cart ({heldCartsHook.heldCarts.length})</span>
            </button>
          )}
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="rounded-xl bg-emerald-50 px-4 py-2.5 text-xs text-emerald-800 border border-emerald-200 flex items-center justify-between">
          <span>✓ {successMsg}</span>
          <button onClick={() => setSuccessMsg("")} className="font-bold text-emerald-600">
            &times;
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-xl bg-rose-50 px-4 py-2.5 text-xs text-rose-700 border border-rose-200 flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button onClick={() => setError("")} className="font-bold text-rose-600">
            &times;
          </button>
        </div>
      )}

      {/* Main Dual-Column POS Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Column: Product Catalog & Category Tabs */}
        <div className="lg:col-span-7 h-[calc(100vh-190px)] min-h-[550px]">
          <PosProductCatalog
            products={products}
            categories={categories}
            loading={productsLoading}
            onAddToCart={cartHook.addToCart}
            onOpenScanner={() => setIsScannerOpen(true)}
          />
        </div>

        {/* Right Column: Order Cart & Payment Tender Panel */}
        <div className="lg:col-span-5 flex flex-col gap-3 h-[calc(100vh-190px)] min-h-[550px]">
          <div className="flex-1 min-h-[220px]">
            <PosCartTable
              cart={cartHook.cart}
              itemCount={cartHook.itemCount}
              onUpdateQty={cartHook.updateQty}
              onRemoveItem={cartHook.removeFromCart}
              onClearCart={cartHook.clearCart}
              onHoldCart={() => {
                heldCartsHook.holdCurrentCart(
                  cartHook.cart,
                  cartHook.rawSubtotal,
                );
                cartHook.clearCart();
                setSuccessMsg("Cart suspended. Click Recall Cart to resume.");
                setTimeout(() => setSuccessMsg(""), 3000);
              }}
              onOpenImeiModal={(item) => setImeiModalItem(item)}
              onOpenPriceModal={(item) => setPriceModalItem(item)}
              onOpenDiscountModal={(item) => setDiscountModalItem(item)}
            />
          </div>

          <div className="shrink-0">
            <PosPaymentPanel
              rawSubtotal={cartHook.rawSubtotal}
              discountTotal={cartHook.discountTotal}
              taxTotal={cartHook.taxTotal}
              grandTotal={cartHook.grandTotal}
              taxEnabled={cartHook.taxEnabled}
              globalDiscountPercent={cartHook.globalDiscountPercent}
              submitting={submitting}
              isOnline={offlineHook.isOnline}
              onToggleTax={cartHook.toggleTax}
              onApplyGlobalDiscount={cartHook.applyGlobalDiscount}
              onClearDiscounts={cartHook.clearDiscounts}
              onOpenCustomGlobalDiscount={() =>
                setIsCustomGlobalDiscountOpen(true)
              }
              onCheckout={handleCheckout}
            />
          </div>
        </div>
      </div>

      {/* Modals & Dialogs */}
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

      <PosImeiPickerModal
        item={imeiModalItem}
        isOpen={imeiModalItem !== null}
        onClose={() => setImeiModalItem(null)}
        onSaveImeis={cartHook.assignImeis}
      />

      <PosPriceEditModal
        item={priceModalItem}
        isOpen={priceModalItem !== null}
        onClose={() => setPriceModalItem(null)}
        onSavePrice={cartHook.setItemPrice}
      />

      <PosDiscountModal
        targetItem={discountModalItem}
        isOpen={discountModalItem !== null || isCustomGlobalDiscountOpen}
        onClose={() => {
          setDiscountModalItem(null);
          setIsCustomGlobalDiscountOpen(false);
        }}
        onApplyItemDiscount={cartHook.setItemDiscount}
        onApplyGlobalDiscount={cartHook.applyGlobalDiscount}
      />

      <PosHeldCartsModal
        isOpen={heldCartsHook.showHeldCartsModal}
        heldCarts={heldCartsHook.heldCarts}
        onClose={() => heldCartsHook.setShowHeldCartsModal(false)}
        onResumeCart={(heldId) => {
          const items = heldCartsHook.resumeHeldCart(heldId);
          if (items) cartHook.setCart(items);
        }}
        onDiscardCart={heldCartsHook.discardHeldCart}
      />

      <ShiftStatusModal
        isOpen={isShiftModalOpen}
        onClose={() => setIsShiftModalOpen(false)}
        onShiftUpdated={() => revalidateShift()}
      />
    </div>
  );
}
