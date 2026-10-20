import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/security";
import { checkRateLimit } from "@/lib/rate-limit";
import {
  getSupabaseRealtimeConfig,
  signStaffRealtimeToken,
} from "@/lib/supabase-realtime";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getCurrentUser();
  if (!user || (user.role !== "STAFF" && user.role !== "ADMIN")) {
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

  const signed = await signStaffRealtimeToken(user);
  if (!signed) {
    return NextResponse.json(
      { enabled: false, message: "Realtime is not configured." },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { enabled: true, token: signed.token, expiresInSeconds: signed.expiresInSeconds },
    { headers: { "Cache-Control": "no-store" } },
  );
}
