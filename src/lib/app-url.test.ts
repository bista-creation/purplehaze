import { describe, expect, it } from "vitest";
import {
  googleCallbackUrl,
  isLocalhostAppUrl,
  normalizeAppUrl,
} from "./app-url";

describe("normalizeAppUrl", () => {
  it("removes a trailing slash", () => {
    expect(normalizeAppUrl("https://purplehaze-nine.vercel.app/")).toBe(
      "https://purplehaze-nine.vercel.app",
    );
  });

  it("collapses duplicated path slashes", () => {
    expect(
      normalizeAppUrl("https://purplehaze-nine.vercel.app//api/auth"),
    ).toBe("https://purplehaze-nine.vercel.app/api/auth");
  });

  it("falls back for missing or invalid values", () => {
    expect(normalizeAppUrl(undefined, "https://fallback.example")).toBe(
      "https://fallback.example",
    );
    expect(normalizeAppUrl("not a url", "https://fallback.example")).toBe(
      "https://fallback.example",
    );
  });
});

describe("isLocalhostAppUrl", () => {
  it("detects local development origins", () => {
    expect(isLocalhostAppUrl("http://localhost:3000")).toBe(true);
    expect(isLocalhostAppUrl("http://127.0.0.1:3000")).toBe(true);
    expect(isLocalhostAppUrl("https://purplehaze-nine.vercel.app")).toBe(false);
  });
});

describe("googleCallbackUrl", () => {
  it("returns the exact single-slash callback registered with Google", () => {
    expect(googleCallbackUrl("https://purplehaze-nine.vercel.app/")).toBe(
      "https://purplehaze-nine.vercel.app/api/auth/callback/google",
    );
  });
});
