"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartAddOn {
  id: string;
  name: string;
  price: number;
}

export interface CartLine {
  lineId: string;
  dishId: string;
  name: string;
  slug: string;
  image?: string | null;
  categoryName?: string;
  basePrice: number;
  variantId?: string | null;
  variantName?: string | null;
  variantPrice?: number;
  addOns: CartAddOn[];
  unitPrice: number;
  quantity: number;
  instructions?: string;
}

export interface AddToCartInput {
  dishId: string;
  name: string;
  slug: string;
  image?: string | null;
  categoryName?: string;
  basePrice: number;
  variantId?: string | null;
  variantName?: string | null;
  variantPrice?: number;
  addOns?: CartAddOn[];
  quantity: number;
  instructions?: string;
}

interface CartState {
  items: CartLine[];
  isOpen: boolean;
  addItem: (input: AddToCartInput) => void;
  removeItem: (lineId: string) => void;
  setQuantity: (lineId: string, quantity: number) => void;
  clearCart: () => void;
  openCart: () => void;
  closeCart: () => void;
  setCartOpen: (open: boolean) => void;
}

function lineKey(input: AddToCartInput) {
  const addOnIds = (input.addOns ?? [])
    .map((addOn) => addOn.id)
    .sort()
    .join("+");
  return [
    input.dishId,
    input.variantId ?? "base",
    addOnIds || "none",
    (input.instructions ?? "").trim().toLowerCase(),
  ].join(":");
}

export function cartSubtotal(items: CartLine[]) {
  return items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
}

export function cartCount(items: CartLine[]) {
  return items.reduce((sum, item) => sum + item.quantity, 0);
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isOpen: false,
      addItem: (input) =>
        set((state) => {
          const lineId = lineKey(input);
          const existing = state.items.find((item) => item.lineId === lineId);
          const quantity = Math.min(20, Math.max(1, input.quantity));
          if (existing) {
            return {
              items: state.items.map((item) =>
                item.lineId === lineId
                  ? {
                      ...item,
                      quantity: Math.min(20, item.quantity + quantity),
                    }
                  : item,
              ),
              isOpen: true,
            };
          }
          const addOns = input.addOns ?? [];
          const variantPrice = input.variantPrice ?? 0;
          const unitPrice =
            input.basePrice +
            variantPrice +
            addOns.reduce((sum, addOn) => sum + addOn.price, 0);
          return {
            items: [
              ...state.items,
              {
                lineId,
                dishId: input.dishId,
                name: input.name,
                slug: input.slug,
                image: input.image,
                categoryName: input.categoryName,
                basePrice: input.basePrice,
                variantId: input.variantId,
                variantName: input.variantName,
                variantPrice,
                addOns,
                unitPrice,
                quantity,
                instructions: input.instructions?.trim() || undefined,
              },
            ],
            isOpen: true,
          };
        }),
      removeItem: (lineId) =>
        set((state) => ({
          items: state.items.filter((item) => item.lineId !== lineId),
        })),
      setQuantity: (lineId, quantity) =>
        set((state) => ({
          items:
            quantity <= 0
              ? state.items.filter((item) => item.lineId !== lineId)
              : state.items.map((item) =>
                  item.lineId === lineId
                    ? { ...item, quantity: Math.min(20, quantity) }
                    : item,
                ),
        })),
      clearCart: () => set({ items: [], isOpen: false }),
      openCart: () => set({ isOpen: true }),
      closeCart: () => set({ isOpen: false }),
      setCartOpen: (open) => set({ isOpen: open }),
    }),
    {
      name: "purple-haze-cart",
      version: 1,
      partialize: (state) => ({ items: state.items }),
    },
  ),
);
