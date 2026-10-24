import { beforeEach, describe, expect, it } from "vitest";
import { cartCount, cartSubtotal, useCartStore, type CartLine } from "./cart-store";

describe("Cart calculations", () => {
  beforeEach(() => {
    useCartStore.getState().clearCart();
  });

  it("calculates cart subtotal correctly across simple items", () => {
    const items: CartLine[] = [
      {
        lineId: "line-1",
        dishId: "dish-1",
        name: "Steam Chicken Momo",
        slug: "steam-chicken-momo",
        basePrice: 28000,
        addOns: [],
        unitPrice: 28000,
        quantity: 2,
      },
      {
        lineId: "line-2",
        dishId: "dish-2",
        name: "Cold Coffee",
        slug: "cold-coffee",
        basePrice: 18000,
        addOns: [],
        unitPrice: 18000,
        quantity: 1,
      },
    ];

    expect(cartSubtotal(items)).toBe(28000 * 2 + 18000);
    expect(cartCount(items)).toBe(3);
  });

  it("calculates cart subtotal with dish variants and add-ons", () => {
    const items: CartLine[] = [
      {
        lineId: "line-momo",
        dishId: "dish-momo",
        name: "Momo",
        slug: "momo",
        basePrice: 25000,
        variantId: "var-jhol",
        variantName: "Jhol Momo",
        variantPrice: 4000,
        addOns: [
          { id: "addon-chutney", name: "Extra Chutney", price: 3000 },
          { id: "addon-soup", name: "Extra Soup", price: 2000 },
        ],
        unitPrice: 25000 + 4000 + 3000 + 2000, // 34000
        quantity: 3,
      },
    ];

    expect(cartSubtotal(items)).toBe(34000 * 3);
    expect(cartCount(items)).toBe(3);
  });

  it("adds and deduplicates items with identical variants and add-ons in Zustand store", () => {
    const store = useCartStore.getState();

    store.addItem({
      dishId: "dish-1",
      name: "Steam Chicken Momo",
      slug: "steam-chicken-momo",
      basePrice: 28000,
      quantity: 1,
    });

    store.addItem({
      dishId: "dish-1",
      name: "Steam Chicken Momo",
      slug: "steam-chicken-momo",
      basePrice: 28000,
      quantity: 2,
    });

    const items = useCartStore.getState().items;
    expect(items.length).toBe(1);
    expect(items[0]?.quantity).toBe(3);
  });

  it("separates items with different variants as separate line items", () => {
    const store = useCartStore.getState();

    store.addItem({
      dishId: "dish-1",
      name: "Chicken Momo",
      slug: "chicken-momo",
      basePrice: 25000,
      variantId: "steam",
      variantName: "Steam",
      variantPrice: 0,
      quantity: 1,
    });

    store.addItem({
      dishId: "dish-1",
      name: "Chicken Momo",
      slug: "chicken-momo",
      basePrice: 25000,
      variantId: "kothey",
      variantName: "Kothey",
      variantPrice: 3000,
      quantity: 1,
    });

    const items = useCartStore.getState().items;
    expect(items.length).toBe(2);
    expect(items[0]?.variantId).toBe("steam");
    expect(items[1]?.variantId).toBe("kothey");
  });

  it("clamps item quantity bounds properly between 1 and 20", () => {
    const store = useCartStore.getState();

    store.addItem({
      dishId: "dish-test",
      name: "Test Dish",
      slug: "test-dish",
      basePrice: 10000,
      quantity: 99,
    });

    expect(useCartStore.getState().items[0]?.quantity).toBe(20);

    const lineId = useCartStore.getState().items[0]?.lineId as string;
    store.setQuantity(lineId, 0);

    expect(useCartStore.getState().items.length).toBe(0);
  });
});
