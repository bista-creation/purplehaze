import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

type Bucket = { count: number; resetAt: number };

const globalStore = globalThis as unknown as {
  __phRateLimitStore?: Map<string, Bucket>;
  __phRateLimitLimiters?: Map<string, Ratelimit>;
  __phRedis?: Redis;
};

const memoryStore =
  globalStore.__phRateLimitStore ?? new Map<string, Bucket>();
globalStore.__phRateLimitStore = memoryStore;

const limiters = globalStore.__phRateLimitLimiters ?? new Map<string, Ratelimit>();
globalStore.__phRateLimitLimiters = limiters;

let memoryChecks = 0;

function hasUpstash() {
  return Boolean(
    process.env.UPSTASH_REDIS_REST_URL &&
      process.env.UPSTASH_REDIS_REST_TOKEN,
  );
}

function getRedis() {
  if (!globalStore.__phRedis) {
    globalStore.__phRedis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return globalStore.__phRedis;
}

function getLimiter(limit: number, windowMs: number) {
  const key = `${limit}:${windowMs}`;
  if (!limiters.has(key)) {
    limiters.set(
      key,
      new Ratelimit({
        redis: getRedis(),
        limiter: Ratelimit.slidingWindow(
          limit,
          `${Math.max(1, Math.ceil(windowMs / 1000))} s`,
        ),
        analytics: false,
        prefix: `purple-haze:${key}`,
      }),
    );
  }
  return limiters.get(key)!;
}

/**
 * Production uses Upstash when configured; local development falls back to an
 * in-process sliding window. The fallback is intentionally best-effort because
 * serverless instances do not share memory.
 */
export async function checkRateLimit(
  identifier: string,
  limit = 10,
  windowMs = 60_000,
): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  if (hasUpstash()) {
    try {
      const result = await getLimiter(limit, windowMs).limit(identifier);
      return {
        success: result.success,
        remaining: result.remaining,
        resetAt: result.reset,
      };
    } catch (error) {
      console.error("Upstash rate limit failed; using local fallback.", error);
    }
  }

  const now = Date.now();
  memoryChecks += 1;
  if (memoryChecks % 1000 === 0) clearExpiredLimitBuckets();
  const existing = memoryStore.get(identifier);
  if (!existing || existing.resetAt <= now) {
    memoryStore.set(identifier, { count: 1, resetAt: now + windowMs });
    return { success: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  existing.count += 1;
  const success = existing.count <= limit;
  return {
    success,
    remaining: Math.max(0, limit - existing.count),
    resetAt: existing.resetAt,
  };
}

export function clearExpiredLimitBuckets() {
  const now = Date.now();
  for (const [key, bucket] of memoryStore.entries()) {
    if (bucket.resetAt <= now) memoryStore.delete(key);
  }
}
