import "server-only";
import crypto from "crypto";

const OTP_SECRET =
  process.env.DELIVERY_OTP_SECRET ||
  process.env.NEXTAUTH_SECRET ||
  "purplehaze-secure-fallback-otp-secret-key-salt";

/**
 * Derives a deterministic 6-digit delivery OTP from deliveryId and otpVersion using HMAC-SHA256.
 * Changing otpVersion immediately invalidates any previously generated OTP.
 */
export function generateDeliveryOtp(deliveryId: string, otpVersion: number): string {
  const hmac = crypto.createHmac("sha256", OTP_SECRET);
  hmac.update(`${deliveryId}:${otpVersion}`);
  const digest = hmac.digest();
  // Read first 4 bytes as unsigned integer, modulo 900,000 + 100,000 gives 100000 - 999999
  const num = digest.readUInt32BE(0) % 900000 + 100000;
  return num.toString();
}

/**
 * Constant-time verification of candidate delivery OTP.
 */
export function verifyDeliveryOtp(
  deliveryId: string,
  otpVersion: number,
  candidateOtp: string
): boolean {
  if (!candidateOtp || candidateOtp.length !== 6 || !/^\d{6}$/.test(candidateOtp)) {
    return false;
  }
  const expectedOtp = generateDeliveryOtp(deliveryId, otpVersion);
  const expectedBuf = Buffer.from(expectedOtp, "utf8");
  const candidateBuf = Buffer.from(candidateOtp, "utf8");

  if (expectedBuf.length !== candidateBuf.length) {
    return false;
  }

  return crypto.timingSafeEqual(expectedBuf, candidateBuf);
}
