export type PaymentMode = "mock" | "sandbox" | "live";
export type PaymentDisplayMode = PaymentMode | "unavailable";

type PaymentEnvironment = {
  NODE_ENV?: string;
  VERCEL_ENV?: string;
  ALLOW_TEST_PAYMENTS?: string;
  PAYMENT_SANDBOX_UNTIL?: string;
};

function isEnabled(value: string | undefined) {
  return value?.trim().toLowerCase() === "true";
}

/**
 * Mock payments are a development/preview tool. They are never available in a
 * Vercel production deployment.
 */
export function isMockPaymentAllowed(env: PaymentEnvironment = process.env) {
  if (env.VERCEL_ENV === "production") return false;
  return env.NODE_ENV !== "production" || isEnabled(env.ALLOW_TEST_PAYMENTS);
}

/**
 * Returns the configured end of the temporary production sandbox window, or
 * null when the value is missing or not a valid timestamp.
 */
export function getSandboxPaymentExpiry(
  env: PaymentEnvironment = process.env,
) {
  const raw = env.PAYMENT_SANDBOX_UNTIL?.trim();
  if (!raw) return null;
  const expiry = new Date(raw);
  return Number.isFinite(expiry.getTime()) ? expiry : null;
}

/**
 * Sandbox payments normally follow the same development/preview rules as mock
 * payments. Vercel production can open a deliberately time-boxed sandbox
 * window with both ALLOW_TEST_PAYMENTS=true and a future
 * PAYMENT_SANDBOX_UNTIL. The window closes automatically; there is no
 * permanent production sandbox switch.
 */
export function isSandboxPaymentAllowed(
  env: PaymentEnvironment = process.env,
  now: Date = new Date(),
) {
  if (env.VERCEL_ENV !== "production") {
    return isMockPaymentAllowed(env);
  }
  if (!isEnabled(env.ALLOW_TEST_PAYMENTS)) return false;
  const expiry = getSandboxPaymentExpiry(env);
  return Boolean(expiry && expiry.getTime() > now.getTime());
}

export function isPaymentModeAllowed(
  mode: PaymentMode,
  env: PaymentEnvironment = process.env,
  now: Date = new Date(),
) {
  if (mode === "live") return true;
  if (mode === "mock") return isMockPaymentAllowed(env);
  return isSandboxPaymentAllowed(env, now);
}

/**
 * True when either test mode is enabled. Gate mock payments with
 * isMockPaymentAllowed so a production sandbox window never re-enables mock
 * payments.
 */
export function isTestPaymentModeAllowed(
  env: PaymentEnvironment = process.env,
  now: Date = new Date(),
) {
  return (
    isMockPaymentAllowed(env) || isSandboxPaymentAllowed(env, now)
  );
}
