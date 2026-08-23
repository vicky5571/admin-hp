"use client";

import { useCallback, useEffect, useState } from "react";
import { createSale, generateIdempotencyKey, ReceiptPayload } from "@/lib/api";
import { CartItem, OfflineSaleQueueItem, SplitPaymentLine } from "../types";

const OFFLINE_QUEUE_KEY = "smartstore_offline_sales_queue";

export function useOfflinePos() {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );
  const [offlineQueue, setOfflineQueue] = useState<OfflineSaleQueueItem[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState("");

  // Load offline queue on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(OFFLINE_QUEUE_KEY);
      if (saved) {
        setOfflineQueue(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  const saveQueue = (updated: OfflineSaleQueueItem[]) => {
    setOfflineQueue(updated);
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Sync offline sales to backend
  const syncOfflineSales = useCallback(async () => {
    const pendingItems = offlineQueue.filter((q) => !q.synced);
    if (pendingItems.length === 0 || isSyncing) return;

    setIsSyncing(true);
    setSyncStatusMsg(`Syncing ${pendingItems.length} offline sale(s)...`);

    const updatedQueue = [...offlineQueue];

    for (let i = 0; i < updatedQueue.length; i++) {
      const item = updatedQueue[i];
      if (item.synced) continue;

      try {
        await createSale(item.payload);
        item.synced = true;
        item.syncError = undefined;
      } catch (err: any) {
        // If conflict or already created, mark synced
        if (
          err?.message?.includes("idempotency") ||
          err?.message?.includes("duplicate")
        ) {
          item.synced = true;
        } else {
          item.syncError = err?.message || "Sync failed";
        }
      }
    }

    saveQueue(updatedQueue);
    setIsSyncing(false);
    setSyncStatusMsg("Offline sales synchronized with server.");
    setTimeout(() => setSyncStatusMsg(""), 4000);
  }, [offlineQueue, isSyncing]);

  // Online / Offline Listeners
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncOfflineSales();
    };

    const handleOffline = () => {
      setIsOnline(false);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [syncOfflineSales]);

  // Record an offline sale transaction
  const queueOfflineSale = (
    cart: CartItem[],
    totals: {
      rawSubtotal: number;
      discountTotal: number;
      taxTotal: number;
      grandTotal: number;
    },
    payments: SplitPaymentLine[],
    cashierName = "Cashier",
    shiftId?: number,
  ): { saleResult: any; receiptPayload: ReceiptPayload } => {
    const idempotencyKey = generateIdempotencyKey();
    const offlineId = `OFF-${Date.now().toString(36).toUpperCase()}`;
    const timestamp = new Date().toISOString();

    const salePayload = {
      items: cart.map((i) => ({
        productId: i.productId,
        qty: i.qty,
        unitPrice: i.unitPrice,
        discountAmount: i.discountAmount,
        taxAmount: i.taxAmount,
        lineTotal: i.lineTotal,
        imeis: i.imeis.length > 0 ? i.imeis : undefined,
      })),
      subtotal: totals.rawSubtotal,
      discountTotal: totals.discountTotal,
      taxTotal: totals.taxTotal,
      grandTotal: totals.grandTotal,
      payments: payments.map((p) => ({
        method: p.method,
        amount: p.amount,
        referenceNo: p.referenceNo,
      })),
      idempotencyKey,
      shiftId,
      notes: "OFFLINE_TRANSACTION",
    };

    const receiptPayload: ReceiptPayload = {
      id: Date.now(),
      invoiceNumber: offlineId,
      saleTime: timestamp,
      cashier: { id: 0, fullName: cashierName },
      customer: { id: 0, name: "Walk-in Customer" },
      items: cart.map((i) => ({
        productName: i.name,
        qty: i.qty,
        unitPrice: i.unitPrice.toFixed(2),
        discountAmount: i.discountAmount.toFixed(2),
        lineTotal: i.lineTotal.toFixed(2),
        imeis: i.imeis.map((val) => ({ imei: val })),
      })),
      subtotal: totals.rawSubtotal.toFixed(2),
      discountTotal: totals.discountTotal.toFixed(2),
      taxTotal: totals.taxTotal.toFixed(2),
      grandTotal: totals.grandTotal.toFixed(2),
      payments: payments.map((p) => ({
        method: p.method,
        amount: p.amount.toFixed(2),
        referenceNumber: p.referenceNo,
      })),
      notes: "Offline receipt - will auto-sync to cloud when online.",
    };

    const newQueueItem: OfflineSaleQueueItem = {
      id: offlineId,
      idempotencyKey,
      timestamp,
      payload: salePayload,
      receiptData: receiptPayload,
      synced: false,
    };

    saveQueue([newQueueItem, ...offlineQueue]);

    return {
      saleResult: {
        id: offlineId,
        invoiceNumber: offlineId,
        grandTotal: totals.grandTotal,
        paidTotal: payments.reduce((sum, p) => sum + p.amount, 0),
        change: Math.max(
          0,
          payments.reduce((sum, p) => sum + p.amount, 0) - totals.grandTotal,
        ),
        isOffline: true,
      },
      receiptPayload,
    };
  };

  const clearSyncedQueue = () => {
    const unSynced = offlineQueue.filter((q) => !q.synced);
    saveQueue(unSynced);
  };

  const pendingSyncCount = offlineQueue.filter((q) => !q.synced).length;

  return {
    isOnline,
    offlineQueue,
    isSyncing,
    pendingSyncCount,
    syncStatusMsg,
    queueOfflineSale,
    syncOfflineSales,
    clearSyncedQueue,
  };
}
