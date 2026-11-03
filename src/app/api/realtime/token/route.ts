import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/security";
import { getAuthContext } from "@/lib/api/auth-context";
import { checkRateLimit } from "@/lib/rate-limit";
import { prisma } from "@/lib/prisma";
import {
  getSupabaseRealtimeConfig,
  signRealtimeToken,
  signCustomerTrackingToken,
} from "@/lib/supabase-realtime";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const orderId = url.searchParams.get("orderId");

  if (!getSupabaseRealtimeConfig()) {
    return NextResponse.json(
      { enabled: false, message: "Realtime is not configured." },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // CASE 1: Customer Order Tracking Token
  if (orderId) {
    const user = (await getAuthContext(req)) || (await getCurrentUser());

    // Explicit invariant: RIDER accounts are blocked from customer tracking
    if (user && user.role === "RIDER") {
      return NextResponse.json(
        { enabled: false, message: "Rider accounts cannot access customer tracking." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        userId: true,
        publicToken: true,
        status: true,
      },
    });

    if (!order) {
      return NextResponse.json(
        { enabled: false, message: "Order not found." },
        { status: 404, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Verify ownership or guest tracking token
    const isOwner = user && (user.role === "ADMIN" || user.role === "STAFF" || order.userId === user.id);
    const guestToken = req.headers.get("x-order-token");
    const isAuthorizedGuest = Boolean(guestToken && order.publicToken && guestToken === order.publicToken);

    if (!isOwner && !isAuthorizedGuest) {
      return NextResponse.json(
        { enabled: false, message: "Unauthorized to track this order." },
        { status: 403, headers: { "Cache-Control": "no-store" } }
      );
    }

    // Invariant: Live tracking channel is only minted while OUT_FOR_DELIVERY
    if (order.status !== "OUT_FOR_DELIVERY") {
      return NextResponse.json(
        { enabled: false, message: "Live tracking is only available while order is out for delivery." },
        { status: 400, headers: { "Cache-Control": "no-store" } }
      );
    }

    const rateKey = user ? `tracking-token:${user.id}` : `tracking-token:guest:${order.id}`;
    const limit = await checkRateLimit(rateKey, 20, 60_000);
    if (!limit.success) {
      return NextResponse.json(
        { enabled: false, message: "Too many tracking token requests." },
        { status: 429, headers: { "Cache-Control": "no-store" } }
      );
    }

    const signed = await signCustomerTrackingToken({
      orderId: order.id,
      userId: user?.id,
    });

    if (!signed) {
      return NextResponse.json(
        { enabled: false, message: "Failed to sign tracking token." },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    return NextResponse.json(
      {
        enabled: true,
        token: signed.token,
        expiresInSeconds: signed.expiresInSeconds,
        channel: signed.channel,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  // CASE 2: Standard Dashboard Realtime Token
  const user = (await getAuthContext(req)) || (await getCurrentUser());
  if (!user) {
    return NextResponse.json(
      { enabled: false, message: "Not authorized." },
      { status: 401, headers: { "Cache-Control": "no-store" } }
    );
  }

  const limit = await checkRateLimit(`realtime-token:${user.id}`, 30, 60_000);
  if (!limit.success) {
    return NextResponse.json(
      { enabled: false, message: "Too many requests." },
      { status: 429, headers: { "Cache-Control": "no-store" } }
    );
  }

  const signed = await signRealtimeToken({
    id: user.id,
    email: user.email,
    role: user.role,
  });
  if (!signed) {
    return NextResponse.json(
      { enabled: false, message: "Realtime is not configured." },
      { headers: { "Cache-Control": "no-store" } }
    );
  }

  return NextResponse.json(
    {
      enabled: true,
      token: signed.token,
      expiresInSeconds: signed.expiresInSeconds,
      channels: {
        user: `user-${user.id}`,
        menuAvailability: "menu-availability",
        adminOrders:
          user.role === "STAFF" || user.role === "ADMIN" ? "admin-orders" : null,
      },
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
