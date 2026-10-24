import { describe, expect, it, vi } from "vitest";

vi.mock("@/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn().mockResolvedValue(new Headers()),
}));

import {
  generateSecureToken,
  hashToken,
  isAdminRole,
  isStaffRole,
} from "./security";

describe("Role and Security Access Control", () => {
  it("strictly validates ADMIN role", () => {
    expect(isAdminRole("ADMIN")).toBe(true);
    expect(isAdminRole("STAFF")).toBe(false);
    expect(isAdminRole("CUSTOMER")).toBe(false);
    expect(isAdminRole(undefined)).toBe(false);
    expect(isAdminRole("admin")).toBe(false); // Case sensitive
  });

  it("validates STAFF and ADMIN for operational staff role access", () => {
    expect(isStaffRole("ADMIN")).toBe(true);
    expect(isStaffRole("STAFF")).toBe(true);
    expect(isStaffRole("CUSTOMER")).toBe(false);
    expect(isStaffRole(undefined)).toBe(false);
  });

  it("generates cryptographic tokens and produces consistent SHA-256 hashes", () => {
    const token = generateSecureToken(32);
    expect(token).toBeDefined();
    expect(token.length).toBeGreaterThanOrEqual(32);

    const hash1 = hashToken(token);
    const hash2 = hashToken(token);
    expect(hash1).toBe(hash2);
    expect(hash1).toHaveLength(64); // SHA-256 hex string is 64 chars
  });
});
