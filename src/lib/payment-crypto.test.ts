import { describe, expect, it } from "vitest";
import {
  parseEsewaAmount,
  parseEsewaCallbackData,
  signEsewa,
  verifyEsewaSignature,
} from "./payment-crypto";

const TEST_SECRET = "8gBm/:&EnhH.1/q";

describe("signEsewa", () => {
  it("creates the HMAC-SHA256 base64 signature for the signed fields", () => {
    const message =
      "total_amount=100,transaction_uuid=11-201-13,product_code=EPAYTEST";
    expect(signEsewa(message, TEST_SECRET)).toBe(
      "5DZywcrTKD0gia/rsSMcrRHmJl+4Tbol6S+lWgdJ94E=",
    );
  });
});

describe("verifyEsewaSignature", () => {
  it("accepts a valid callback signature", () => {
    const payload: Record<string, string> = {
      transaction_code: "0004T5I",
      status: "COMPLETE",
      total_amount: "230",
      transaction_uuid: "12-6-23",
      product_code: "EPAYTEST",
      signed_field_names:
        "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
    };
    const message = payload.signed_field_names
      .split(",")
      .map((field) => `${field}=${payload[field] ?? ""}`)
      .join(",");
    payload.signature = signEsewa(message, TEST_SECRET);

    expect(verifyEsewaSignature(payload, TEST_SECRET)).toBe(true);
  });

  it("rejects tampered values and missing signatures", () => {
    const payload: Record<string, string> = {
      transaction_code: "0004T5I",
      status: "COMPLETE",
      total_amount: "230",
      transaction_uuid: "12-6-23",
      product_code: "EPAYTEST",
      signed_field_names:
        "transaction_code,status,total_amount,transaction_uuid,product_code,signed_field_names",
      signature: "not-a-real-signature",
    };
    expect(verifyEsewaSignature(payload, TEST_SECRET)).toBe(false);

    delete payload.signature;
    expect(verifyEsewaSignature(payload, TEST_SECRET)).toBe(false);
  });
});

describe("parseEsewaCallbackData", () => {
  it("decodes base64 JSON and normalises values to strings", () => {
    const encoded = Buffer.from(
      JSON.stringify({
        status: "COMPLETE",
        total_amount: 230,
        transaction_uuid: "12-6-23",
        paid: true,
        ignored: { nested: "value" },
      }),
    ).toString("base64");

    const parsed = parseEsewaCallbackData(encoded);
    expect(parsed).toEqual({
      status: "COMPLETE",
      total_amount: "230",
      transaction_uuid: "12-6-23",
      paid: "true",
    });
  });

  it("recovers plus signs lost to query-string decoding", () => {
    const encoded = Buffer.from(
      JSON.stringify({ status: "COMPLETE", transaction_uuid: "12-6-23" }),
    ).toString("base64");
    const mangled = encoded.replace(/\+/g, " ");

    expect(parseEsewaCallbackData(mangled)).toEqual(
      parseEsewaCallbackData(encoded),
    );
  });

  it("returns null for unreadable payloads", () => {
    expect(parseEsewaCallbackData("not-base64-json")).toBeNull();
  });
});

describe("parseEsewaAmount", () => {
  it("handles eSewa's thousands separators", () => {
    expect(parseEsewaAmount("1,000.0")).toBe(1000);
    expect(parseEsewaAmount("1,00,000.5")).toBe(100000.5);
  });

  it("handles plain numbers and numeric strings", () => {
    expect(parseEsewaAmount(230)).toBe(230);
    expect(parseEsewaAmount("886.2")).toBe(886.2);
    expect(parseEsewaAmount(" 519.80 ")).toBe(519.8);
  });

  it("returns NaN for missing or empty values", () => {
    expect(parseEsewaAmount(undefined)).toBeNaN();
    expect(parseEsewaAmount(null)).toBeNaN();
    expect(parseEsewaAmount("")).toBeNaN();
    expect(parseEsewaAmount("abc")).toBeNaN();
  });
});
