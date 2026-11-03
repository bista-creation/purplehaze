import { NextRequest } from "next/server";
import { z } from "zod";
import { requireRiderAuth } from "@/lib/api/auth-context";
import { jsonError, jsonOk, jsonZodError } from "@/lib/api/response";
import { prisma } from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { locationStore } from "@/lib/location-store";
import { broadcastEvent } from "@/lib/realtime/broadcast";

// Coordinate validation: realistic globe coordinates
const locationSchema = z.object({
  latitude: z.number().min(-90, "Latitude must be >= -90").max(90, "Latitude must be <= 90"),
  longitude: z.number().min(-180, "Longitude must be >= -180").max(180, "Longitude must be <= 180"),
});

export async function POST(req: NextRequest) {
  const { user, errorResponse } = await requireRiderAuth(req);
  if (errorResponse) return errorResponse;

  // Rate limit: 1 location ping per 8 seconds per rider (rider sends pings ~every 12s)
  const rateLimit = await checkRateLimit(`rider:loc:${user.id}`, 1, 8_000);
  if (!rateLimit.success) {
    return jsonError("RATE_LIMITED", "Too many location pings. Please throttle to 12s interval.", 429);
  }

  try {
    const body = await req.json();
    const parsed = locationSchema.safeParse(body);
    if (!parsed.success) {
      return jsonZodError(parsed.error);
    }

    const { latitude, longitude } = parsed.data;

    const rider = await prisma.riderProfile.findUnique({
      where: { userId: user.id },
      select: { id: true, shiftStatus: true },
    });

    if (!rider) {
      return jsonError("NOT_FOUND", "Rider profile not found", 404);
    }

    // Data minimization: find active order currently OUT FOR DELIVERY (PICKED_UP state)
    const activeDelivery = await prisma.delivery.findFirst({
      where: {
        riderId: rider.id,
        status: "PICKED_UP",
      },
      select: {
        id: true,
        orderId: true,
      },
    });

    if (!activeDelivery) {
      // Not actively in transit with food: do not store or broadcast rider GPS
      return jsonOk({
        active: false,
        message: "No active delivery in transit. Location was dropped per privacy minimization.",
      });
    }

    // 1. Store in Upstash Redis with 120s TTL (speed/heading dropped)
    await locationStore.storeLocation(activeDelivery.orderId, {
      lat: latitude,
      lng: longitude,
    });

    // 2. Broadcast transient coordinates to customer tracking channel
    const channelTopic = `order-tracking-${activeDelivery.orderId}`;
    await broadcastEvent(channelTopic, "rider.location", {
      orderId: activeDelivery.orderId,
      lat: latitude,
      lng: longitude,
      updatedAt: new Date().toISOString(),
    });

    return jsonOk({
      active: true,
      orderId: activeDelivery.orderId,
    });
  } catch {
    return jsonError("BAD_REQUEST", "Invalid request body", 400);
  }
}
