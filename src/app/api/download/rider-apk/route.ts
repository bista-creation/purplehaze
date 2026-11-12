import { NextResponse } from "next/server";

// Direct standalone Android APK download artifact URL for Rider App from EAS Build
export const EAS_RIDER_APK_DIRECT_URL =
  "https://expo.dev/artifacts/eas/r3k-KFzBeAF4MKUw4PbodBbqNkWTb_xwq7zZjfGjS-I.apk";

// Fallback EAS build page URL for rider
export const EAS_RIDER_BUILD_PAGE_URL =
  "https://expo.dev/accounts/bistacreations-team/projects/purplehaze-rider/builds/bcb53834-cfb5-4b7c-836a-b70f2f070888";

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
