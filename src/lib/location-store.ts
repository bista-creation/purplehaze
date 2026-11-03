import "server-only";
import { Redis } from "@upstash/redis";

interface CachedLocation {
  lat: number;
  lng: number;
  updatedAt: string;
}

let redisClient: Redis | null = null;
let redisInitialized = false;

function getRedisInstance(): Redis | null {
  if (redisInitialized) return redisClient;
  redisInitialized = true;

  // Use separate location Redis if configured, otherwise fall back to main Upstash Redis
  const url =
    process.env.UPSTASH_REDIS_LOCATION_REST_URL ||
    process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.UPSTASH_REDIS_LOCATION_REST_TOKEN ||
    process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    redisClient = new Redis({ url, token });
  } else {
    console.warn(
      "[LocationStore] Upstash Redis credentials not configured. In-memory fallback will be used."
    );
  }
  return redisClient;
}

// In-memory fallback for local development / testing when Upstash is not provisioned
const memoryLocationStore = new Map<string, { data: CachedLocation; expiresAt: number }>();

export const locationStore = {
  /**
   * Save rider location to Redis with 120s TTL
   * Minimization invariant: only lat, lng, and timestamp stored. Speed and heading are dropped.
   */
  async storeLocation(
    orderId: string,
    location: { lat: number; lng: number }
  ): Promise<void> {
    const payload: CachedLocation = {
      lat: location.lat,
      lng: location.lng,
      updatedAt: new Date().toISOString(),
    };

    const redis = getRedisInstance();
    const key = `order:location:${orderId}`;

    if (redis) {
      try {
        await redis.set(key, JSON.stringify(payload), { ex: 120 });
        return;
      } catch (err) {
        console.error("[LocationStore] Redis set error, using fallback:", err);
      }
    }

    // Memory fallback
    memoryLocationStore.set(key, {
      data: payload,
      expiresAt: Date.now() + 120_000,
    });
  },

  /**
   * Retrieve rider location for an active delivery order
   * Returns isStale = true if no ping has arrived in the last 60 seconds
   */
  async getLocation(orderId: string): Promise<{
    lat: number;
    lng: number;
    updatedAt: string;
    isStale: boolean;
  } | null> {
    const redis = getRedisInstance();
    const key = `order:location:${orderId}`;
    let cached: CachedLocation | null = null;

    if (redis) {
      try {
        const raw = await redis.get<string | CachedLocation>(key);
        if (raw) {
          cached = typeof raw === "string" ? JSON.parse(raw) : raw;
        }
      } catch (err) {
        console.error("[LocationStore] Redis get error, using fallback:", err);
      }
    }

    if (!cached) {
      const entry = memoryLocationStore.get(key);
      if (entry && entry.expiresAt > Date.now()) {
        cached = entry.data;
      } else {
        memoryLocationStore.delete(key);
      }
    }

    if (!cached) return null;

    const pingAgeMs = Date.now() - new Date(cached.updatedAt).getTime();
    const isStale = pingAgeMs > 60_000;

    return {
      lat: cached.lat,
      lng: cached.lng,
      updatedAt: cached.updatedAt,
      isStale,
    };
  },

  /**
   * Immediately evict location from Redis when delivery completes or fails
   * Ensures zero lingering location history after delivery lifecycle terminates
   */
  async evictLocation(orderId: string): Promise<void> {
    const redis = getRedisInstance();
    const key = `order:location:${orderId}`;

    if (redis) {
      try {
        await redis.del(key);
      } catch (err) {
        console.error("[LocationStore] Redis del error:", err);
      }
    }

    memoryLocationStore.delete(key);
  },
};
