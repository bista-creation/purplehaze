import { describe, expect, it } from "vitest";
import { safeNextPath } from "./utils";

describe("safeNextPath", () => {
  it("preserves safe internal paths", () => {
    expect(safeNextPath("/account/orders?tab=all#latest")).toBe(
      "/account/orders?tab=all#latest",
    );
    expect(safeNextPath("/menu")).toBe("/menu");
    expect(safeNextPath("/admin?next=//evil.example")).toBe(
      "/admin?next=//evil.example",
    );
  });

  it.each([
    "https://evil.example",
    "//evil.example",
    "///evil.example",
    "/\\evil.example",
    "/%5cevil.example",
    "/admin\nInjected: yes",
    "/admin%0d%0aInjected:yes",
    " /admin",
  ])("rejects unsafe redirect target %j", (value) => {
    expect(safeNextPath(value)).toBe("/");
  });

  it("returns the fallback for empty or missing values", () => {
    expect(safeNextPath(null)).toBe("/");
    expect(safeNextPath(undefined)).toBe("/");
    expect(safeNextPath("")).toBe("/");
    expect(safeNextPath("", "/menu")).toBe("/menu");
  });
});
