import { NextResponse } from "next/server";

// Direct standalone Android APK download artifact URL for Rider App from EAS Build
export const EAS_RIDER_APK_DIRECT_URL =
  "https://expo.dev/artifacts/eas/_n1ADa09a1pq_dRdC4GL0UyHJ_DKfapdcz7TOTrNe4E.apk";

// Fallback EAS build page URL for rider
export const EAS_RIDER_BUILD_PAGE_URL =
  "https://expo.dev/accounts/bistacreations-team/projects/purplehaze-rider/builds/c55e4371-9f36-4fa1-b2b4-544facd5b4e0";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");

  if (view === "build") {
    return NextResponse.redirect(EAS_RIDER_BUILD_PAGE_URL, { status: 307 });
  }

  // Redirect directly to the standalone Rider APK binary download
  return NextResponse.redirect(
    process.env.NEXT_PUBLIC_RIDER_APK_URL || EAS_RIDER_APK_DIRECT_URL,
    { status: 307 },
  );
}
