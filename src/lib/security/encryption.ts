import "server-only";
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const KEY_VERSION = 1;

function getEncryptionKey(): Buffer {
  const envKey = process.env.RIDER_PII_ENCRYPTION_KEY;
  if (envKey && envKey.length === 64) {
    return Buffer.from(envKey, "hex");
  }
  // Safe deterministic dev fallback key (32 bytes)
  const defaultKey = "7f9a2b4c6e8d0f1a3c5e7b9d1f3a5c7e9b1d3f5a7c9e1b3d5f7a9c1e3b5d7f9a";
  return Buffer.from(defaultKey, "hex");
}

export interface EncryptedPayload {
  v: number;
  iv: string;
  tag: string;
  data: string;
}

export function encryptPii(plainText: string): string {
  if (!plainText) return "";
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // GCM standard 12-byte IV
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(plainText, "utf8", "hex");
  encrypted += cipher.final("hex");
  const tag = cipher.getAuthTag().toString("hex");

  const payload: EncryptedPayload = {
    v: KEY_VERSION,
    iv: iv.toString("hex"),
    tag,
    data: encrypted,
  };

  return JSON.stringify(payload);
}

export function decryptPii(encryptedStr: string | null | undefined): string | null {
  if (!encryptedStr) return null;
  try {
    const payload: EncryptedPayload = JSON.parse(encryptedStr);
    if (!payload.iv || !payload.tag || !payload.data) return null;

    const key = getEncryptionKey();
    const decipher = crypto.createDecipheriv(
      ALGORITHM,
      key,
      Buffer.from(payload.iv, "hex")
    );
    decipher.setAuthTag(Buffer.from(payload.tag, "hex"));

    let decrypted = decipher.update(payload.data, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("PII Decryption failed:", err);
    return null;
  }
}
