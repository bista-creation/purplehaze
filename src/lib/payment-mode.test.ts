import { describe, expect, it } from "vitest";
import { isTestPaymentModeAllowed } from "./payment-mode";

describe("isTestPaymentModeAllowed", () => {
  it("allows test payments in development", () => {
    expect(isTestPaymentModeAllowed({ NODE_ENV: "development" })).toBe(true);
  });

  it("blocks test payments in production by default", () => {
    expect(isTestPaymentModeAllowed({ NODE_ENV: "production" })).toBe(false);
  });

  it("allows an explicit preview opt-in", () => {
    expect(
      isTestPaymentModeAllowed({
        NODE_ENV: "production",
        ALLOW_TEST_PAYMENTS: "true",
      }),
    ).toBe(true);
  });

  it("never allows the opt-in on Vercel production", () => {
    expect(
      isTestPaymentModeAllowed({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        ALLOW_TEST_PAYMENTS: "true",
      }),
    ).toBe(false);
  });

  it("allows the opt-in on a Vercel preview deployment", () => {
    expect(
      isTestPaymentModeAllowed({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        ALLOW_TEST_PAYMENTS: "true",
      }),
    ).toBe(true);
  });
});
