import { describe, expect, it } from "vitest";
import { dishAdminSchema, staffSchema } from "./validations";

const baseStaff = {
  email: "staff@example.com",
  name: "Staff Member",
  phone: "+9779800000000",
  role: "STAFF" as const,
};

describe("staffSchema password policy", () => {
  it("allows an empty password when editing an existing account", () => {
    expect(staffSchema.safeParse({ ...baseStaff, password: "" }).success).toBe(
      true,
    );
  });

  it("requires a letter and a number for a new or changed password", () => {
    expect(
      staffSchema.safeParse({ ...baseStaff, password: "abcdefgh" }).success,
    ).toBe(false);
    expect(
      staffSchema.safeParse({ ...baseStaff, password: "12345678" }).success,
    ).toBe(false);
    expect(
      staffSchema.safeParse({ ...baseStaff, password: "abcdefg1" }).success,
    ).toBe(true);
  });
});

describe("dishAdminSchema variant pricing rules", () => {
  const baseDish = {
    name: "Chicken Momo",
    categoryId: "cat_123",
    description: "Steamed or fried dumplings with spiced minced chicken.",
  };

  it("requires main price when no variants are provided", () => {
    const withoutPrice = dishAdminSchema.safeParse({
      ...baseDish,
      price: 0,
      variants: [],
    });
    expect(withoutPrice.success).toBe(false);

    const withPrice = dishAdminSchema.safeParse({
      ...baseDish,
      price: 250,
      variants: [],
    });
    expect(withPrice.success).toBe(true);
  });

  it("allows main price to be 0/empty when variants are provided with valid prices", () => {
    const res = dishAdminSchema.safeParse({
      ...baseDish,
      price: 0,
      variants: [
        { name: "Steam", priceDelta: 180, isDefault: true },
        { name: "Kothey", priceDelta: 200, isDefault: false },
        { name: "Jhol", priceDelta: 220, isDefault: false },
        { name: "Chilly", priceDelta: 240, isDefault: false },
      ],
    });
    expect(res.success).toBe(true);
  });

  it("requires each variant to have a positive price", () => {
    const res = dishAdminSchema.safeParse({
      ...baseDish,
      price: 0,
      variants: [
        { name: "Steam", priceDelta: 180, isDefault: true },
        { name: "Kothey", priceDelta: 0, isDefault: false },
      ],
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(
        res.error.issues.some((issue) =>
          issue.message.includes("Variant price must be greater than 0"),
        ),
      ).toBe(true);
    }
  });
});
