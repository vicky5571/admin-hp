"use client";

import { useMemo, useState } from "react";
import { Product } from "@/lib/api";
import { CartItem } from "../types";

export function usePosCart() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [taxEnabled, setTaxEnabled] = useState(false); // PPN 11% Toggle
  const [globalDiscountPercent, setGlobalDiscountPercent] = useState<number | null>(null);

  // Add product or barcode scan to cart
  const addToCart = (product: Product, customImei?: string) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.productId === product.id);

      if (existingIndex > -1) {
        const item = prev[existingIndex];
        const newQty = item.qty + 1;
        const newImeis =
          customImei && !item.imeis.includes(customImei)
            ? [...item.imeis, customImei]
            : item.imeis;

        const updated = [...prev];
        updated[existingIndex] = {
          ...item,
          qty: newQty,
          lineTotal: newQty * item.unitPrice - item.discountAmount + item.taxAmount,
          imeis: newImeis,
        };
        return updated;
      }

      const unitPrice = parseFloat(product.srp) || 0;
      const srp = unitPrice;
      const newItem: CartItem = {
        productId: product.id,
        sku: product.sku,
        name: product.name,
        productType: product.productType,
        qty: 1,
        unitPrice,
        srp,
        discountAmount: 0,
        taxAmount: 0,
        lineTotal: unitPrice,
        imeis: customImei ? [customImei] : [],
      };

      return [newItem, ...prev];
    });
  };

  // Update item quantity (0 removes)
  const updateQty = (productId: number, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    setCart((prev) =>
      prev.map((i) => {
        if (i.productId === productId) {
          const lineTotal = newQty * i.unitPrice - i.discountAmount + i.taxAmount;
          return { ...i, qty: newQty, lineTotal: Math.max(0, lineTotal) };
        }
        return i;
      }),
    );
  };

  // Remove item from cart
  const removeFromCart = (productId: number) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  // Clear entire cart
  const clearCart = () => {
    setCart([]);
    setGlobalDiscountPercent(null);
  };

  // Price negotiation: change unit price
  const setItemPrice = (productId: number, newPrice: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.productId === productId) {
          const lineTotal = i.qty * newPrice - i.discountAmount + i.taxAmount;
          return {
            ...i,
            unitPrice: newPrice,
            lineTotal: Math.max(0, lineTotal),
          };
        }
        return i;
      }),
    );
  };

  // Set line item discount
  const setItemDiscount = (productId: number, discountAmount: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.productId === productId) {
          const lineTotal = i.qty * i.unitPrice - discountAmount + i.taxAmount;
          return {
            ...i,
            discountAmount,
            lineTotal: Math.max(0, lineTotal),
          };
        }
        return i;
      }),
    );
  };

  // Assign IMEI list to serialized product
  const assignImeis = (productId: number, imeis: string[]) => {
    setCart((prev) =>
      prev.map((i) => (i.productId === productId ? { ...i, imeis } : i)),
    );
  };

  // Apply quick global discount % across cart
  const applyGlobalDiscount = (percent: number) => {
    setGlobalDiscountPercent(percent);
    setCart((prev) =>
      prev.map((i) => {
        const itemSubtotal = i.qty * i.unitPrice;
        const discountAmt = Math.round(itemSubtotal * (percent / 100));
        const lineTotal = itemSubtotal - discountAmt + i.taxAmount;
        return {
          ...i,
          discountAmount: discountAmt,
          lineTotal: Math.max(0, lineTotal),
        };
      }),
    );
  };

  // Clear all item and cart discounts
  const clearDiscounts = () => {
    setGlobalDiscountPercent(null);
    setCart((prev) =>
      prev.map((i) => {
        const lineTotal = i.qty * i.unitPrice + i.taxAmount;
        return {
          ...i,
          discountAmount: 0,
          lineTotal: Math.max(0, lineTotal),
        };
      }),
    );
  };

  // Toggle PPN 11% Tax
  const toggleTax = () => {
    const next = !taxEnabled;
    setTaxEnabled(next);
    setCart((prev) =>
      prev.map((i) => {
        const taxable = i.qty * i.unitPrice - i.discountAmount;
        const taxAmt = next ? Math.round(taxable * 0.11) : 0;
        const lineTotal = taxable + taxAmt;
        return {
          ...i,
          taxAmount: taxAmt,
          lineTotal: Math.max(0, lineTotal),
        };
      }),
    );
  };

  // Computed Totals
  const rawSubtotal = useMemo(
    () => cart.reduce((acc, i) => acc + i.qty * i.unitPrice, 0),
    [cart],
  );

  const discountTotal = useMemo(
    () => cart.reduce((acc, i) => acc + i.discountAmount, 0),
    [cart],
  );

  const taxTotal = useMemo(
    () => cart.reduce((acc, i) => acc + i.taxAmount, 0),
    [cart],
  );

  const grandTotal = useMemo(
    () => cart.reduce((acc, i) => acc + i.lineTotal, 0),
    [cart],
  );

  const itemCount = useMemo(
    () => cart.reduce((acc, i) => acc + i.qty, 0),
    [cart],
  );

  return {
    cart,
    setCart,
    taxEnabled,
    globalDiscountPercent,
    rawSubtotal,
    discountTotal,
    taxTotal,
    grandTotal,
    itemCount,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    setItemPrice,
    setItemDiscount,
    assignImeis,
    applyGlobalDiscount,
    clearDiscounts,
    toggleTax,
  };
}
