import { describe, expect, it } from "vitest";
import {
  getSandboxPaymentExpiry,
  isMockPaymentAllowed,
  isPaymentModeAllowed,
  isSandboxPaymentAllowed,
  isTestPaymentModeAllowed,
} from "./payment-mode";

const now = new Date("2026-10-21T12:00:00.000Z");
const futureExpiry = "2026-10-28T18:14:59.000Z";
const expired = "2026-10-20T18:14:59.000Z";

describe("isMockPaymentAllowed", () => {
  it("allows mock payments in development", () => {
    expect(isMockPaymentAllowed({ NODE_ENV: "development" })).toBe(true);
  });

  it("blocks mock payments in production by default", () => {
    expect(isMockPaymentAllowed({ NODE_ENV: "production" })).toBe(false);
  });

  it("allows an explicit preview opt-in", () => {
    expect(
      isMockPaymentAllowed({
        NODE_ENV: "production",
        VERCEL_ENV: "preview",
        ALLOW_TEST_PAYMENTS: "true",
      }),
    ).toBe(true);
  });

  it("never allows mock payments on Vercel production", () => {
    expect(
      isMockPaymentAllowed({
        NODE_ENV: "production",
        VERCEL_ENV: "production",
        ALLOW_TEST_PAYMENTS: "true",
        PAYMENT_SANDBOX_UNTIL: futureExpiry,
      }),
    ).toBe(false);
  });
});

describe("isSandboxPaymentAllowed", () => {
  it("allows sandbox payments in development", () => {
    expect(isSandboxPaymentAllowed({ NODE_ENV: "development" }, now)).toBe(
      true,
    );
  });

  it("allows the preview opt-in", () => {
    expect(
      isSandboxPaymentAllowed(
        {
          NODE_ENV: "production",
          VERCEL_ENV: "preview",
          ALLOW_TEST_PAYMENTS: "true",
        },
        now,
      ),
    ).toBe(true);
  });

  it("blocks sandbox payments on Vercel production by default", () => {
    expect(
      isSandboxPaymentAllowed(
        {
          NODE_ENV: "production",
          VERCEL_ENV: "production",
        },
        now,
      ),
    ).toBe(false);
  });

  it("requires an explicit production opt-in", () => {
    expect(
      isSandboxPaymentAllowed(
        {
          NODE_ENV: "production",
          VERCEL_ENV: "production",
          PAYMENT_SANDBOX_UNTIL: futureExpiry,
        },
        now,
      ),
    ).toBe(false);
  });

  it("requires a future expiry on production", () => {
    expect(
      isSandboxPaymentAllowed(
        {
          NODE_ENV: "production",
          VERCEL_ENV: "production",
          ALLOW_TEST_PAYMENTS: "true",
        },
        now,
      ),
    ).toBe(false);
  });

  it("allows a time-boxed production sandbox window", () => {
    expect(
      isSandboxPaymentAllowed(
        {
          NODE_ENV: "production",
          VERCEL_ENV: "production",
          ALLOW_TEST_PAYMENTS: "true",
          PAYMENT_SANDBOX_UNTIL: futureExpiry,
        },
        now,
      ),
    ).toBe(true);
  });

  it("closes automatically after the expiry", () => {
    expect(
      isSandboxPaymentAllowed(
        {
          NODE_ENV: "production",
          VERCEL_ENV: "production",
          ALLOW_TEST_PAYMENTS: "true",
          PAYMENT_SANDBOX_UNTIL: expired,
        },
        now,
      ),
    ).toBe(false);
  });

  it("fails closed on an invalid expiry", () => {
    expect(
      isSandboxPaymentAllowed(
        {
          NODE_ENV: "production",
          VERCEL_ENV: "production",
          ALLOW_TEST_PAYMENTS: "true",
          PAYMENT_SANDBOX_UNTIL: "not-a-date",
        },
        now,
      ),
    ).toBe(false);
  });

  it("closes at the exact expiry timestamp", () => {
    expect(
      isSandboxPaymentAllowed(
        {
          NODE_ENV: "production",
          VERCEL_ENV: "production",
          ALLOW_TEST_PAYMENTS: "true",
          PAYMENT_SANDBOX_UNTIL: futureExpiry,
        },
        new Date(futureExpiry),
      ),
    ).toBe(false);
  });
});

describe("getSandboxPaymentExpiry", () => {
  it("parses a valid timestamp", () => {
    expect(getSandboxPaymentExpiry({ PAYMENT_SANDBOX_UNTIL: futureExpiry }))
      .toEqual(new Date(futureExpiry));
  });

  it("returns null for a missing or invalid timestamp", () => {
    expect(getSandboxPaymentExpiry({})).toBeNull();
    expect(
      getSandboxPaymentExpiry({ PAYMENT_SANDBOX_UNTIL: "not-a-date" }),
    ).toBeNull();
  });
});

describe("isPaymentModeAllowed", () => {
  it("always allows live mode", () => {
    expect(
      isPaymentModeAllowed(
        "live",
        { NODE_ENV: "production", VERCEL_ENV: "production" },
        now,
      ),
    ).toBe(true);
  });

  it("keeps mock blocked during a production sandbox window", () => {
    expect(
      isPaymentModeAllowed(
        "mock",
        {
          NODE_ENV: "production",
          VERCEL_ENV: "production",
          ALLOW_TEST_PAYMENTS: "true",
          PAYMENT_SANDBOX_UNTIL: futureExpiry,
        },
        now,
      ),
    ).toBe(false);
  });

  it("allows sandbox during a valid production window", () => {
    expect(
      isPaymentModeAllowed(
        "sandbox",
        {
          NODE_ENV: "production",
          VERCEL_ENV: "production",
          ALLOW_TEST_PAYMENTS: "true",
          PAYMENT_SANDBOX_UNTIL: futureExpiry,
        },
        now,
      ),
    ).toBe(true);
  });
});

describe("isTestPaymentModeAllowed", () => {
  it("is true while the production sandbox window is open", () => {
    expect(
      isTestPaymentModeAllowed(
        {
          NODE_ENV: "production",
          VERCEL_ENV: "production",
          ALLOW_TEST_PAYMENTS: "true",
          PAYMENT_SANDBOX_UNTIL: futureExpiry,
        },
        now,
      ),
    ).toBe(true);
  });
});
