import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/security";
import { getAuthContext } from "@/lib/api/auth-context";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getSupabaseRealtimeConfig,
  signRealtimeToken,
} from "@/lib/supabase-realtime";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Support both mobile Bearer tokens and web cookie sessions
  const user = (await getAuthContext(req)) || (await getCurrentUser());
  if (!user) {
    return NextResponse.json(
      { enabled: false, message: "Not authorized." },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!getSupabaseRealtimeConfig()) {
    return NextResponse.json(
      { enabled: false, message: "Realtime is not configured." },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const limit = await checkRateLimit(`realtime-token:${user.id}`, 30, 60_000);
  if (!limit.success) {
    return NextResponse.json(
      { enabled: false, message: "Too many requests." },
      { status: 429, headers: { "Cache-Control": "no-store" } },
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
      { headers: { "Cache-Control": "no-store" } },
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
    { headers: { "Cache-Control": "no-store" } },
  );
}
