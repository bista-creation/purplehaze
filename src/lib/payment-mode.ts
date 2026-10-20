export type PaymentMode = "mock" | "sandbox" | "live";
export type PaymentDisplayMode = PaymentMode | "unavailable";

type PaymentEnvironment = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  ALLOW_TEST_PAYMENTS?: string;
};

/**
 * Demo and sandbox payments are development/preview tools. They must never be
 * available in a Vercel production deployment, and are disabled in any
 * production runtime unless a preview explicitly opts in.
 */
export function isTestPaymentModeAllowed(
  env: PaymentEnvironment = process.env,
) {
  if (env.VERCEL_ENV === "production") return false;
  return env.NODE_ENV !== "production" || env.ALLOW_TEST_PAYMENTS === "true";
}
