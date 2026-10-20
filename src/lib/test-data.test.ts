import { afterEach, describe, expect, it, vi } from "vitest";
import {
  isTestOrder,
  realOrderWhere,
  testDataControlsVisible,
} from "./test-data";

afterEach(() => vi.unstubAllEnvs());

describe("test-data markers", () => {
  it("recognises explicit test rows and the legacy seed prefix", () => {
    expect(isTestOrder({ isTest: true })).toBe(true);
    expect(isTestOrder({ orderNumber: "PH-SEED-0001" })).toBe(true);
    expect(isTestOrder({ isTest: false, orderNumber: "PH-2026-0001" })).toBe(
      false,
    );
  });

  it("builds the default real-order filter without dropping other filters", () => {
    expect(realOrderWhere).toMatchObject({
      isTest: false,
      NOT: { orderNumber: { startsWith: "PH-SEED-" } },
    });
  });

  it("only exposes test-data controls outside production", () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(testDataControlsVisible()).toBe(false);
    vi.stubEnv("NODE_ENV", "development");
    expect(testDataControlsVisible()).toBe(true);
  });
});
