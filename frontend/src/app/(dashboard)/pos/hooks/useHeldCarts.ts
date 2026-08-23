"use client";

import { useEffect, useState } from "react";
import { CartItem, HeldCart } from "../types";

const STORAGE_KEY = "smartstore_pos_held_carts";

export function useHeldCarts() {
  const [heldCarts, setHeldCarts] = useState<HeldCart[]>([]);
  const [showHeldCartsModal, setShowHeldCartsModal] = useState(false);

  // Load on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setHeldCarts(JSON.parse(saved));
      }
    } catch {
      // ignore
    }
  }, []);

  // Save to localStorage whenever heldCarts changes
  const saveToStorage = (updated: HeldCart[]) => {
    setHeldCarts(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }
  };

  // Suspend / Hold Current Cart
  const holdCurrentCart = (cart: CartItem[], rawSubtotal: number): boolean => {
    if (cart.length === 0) return false;

    const newHeld: HeldCart = {
      id: `CART-${Date.now().toString().slice(-4)}`,
      savedAt: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      items: [...cart],
      itemCount: cart.reduce((acc, i) => acc + i.qty, 0),
      subtotal: rawSubtotal,
    };

    saveToStorage([newHeld, ...heldCarts]);
    return true;
  };

  // Resume a held cart
  const resumeHeldCart = (heldId: string): CartItem[] | null => {
    const target = heldCarts.find((h) => h.id === heldId);
    if (!target) return null;

    const remaining = heldCarts.filter((h) => h.id !== heldId);
    saveToStorage(remaining);
    setShowHeldCartsModal(false);
    return target.items;
  };

  // Discard a held cart
  const discardHeldCart = (heldId: string) => {
    const remaining = heldCarts.filter((h) => h.id !== heldId);
    saveToStorage(remaining);
  };

  return {
    heldCarts,
    showHeldCartsModal,
    setShowHeldCartsModal,
    holdCurrentCart,
    resumeHeldCart,
    discardHeldCart,
  };
}
