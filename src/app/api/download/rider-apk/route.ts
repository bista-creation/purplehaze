import { NextResponse } from "next/server";

// Direct standalone Android APK download artifact URL for Rider App from EAS Build
export const EAS_RIDER_APK_DIRECT_URL =
  "https://expo.dev/artifacts/eas/8cNvzFnLxLvVoFJHaLVCUzO3Ho2FRuzGplL1RzTeH6Q.apk";

// Fallback EAS build page URL for rider
export const EAS_RIDER_BUILD_PAGE_URL =
  "https://expo.dev/accounts/bistacreation/projects/purplehaze-rider/builds/b6ff012e-a425-4a0c-87b4-fa8162569a62";

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
