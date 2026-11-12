import { NextResponse } from "next/server";

// Direct standalone Android APK download artifact URL from EAS Build
const EAS_APK_DIRECT_URL =
  "https://expo.dev/artifacts/eas/wKe_jE7eJfsifbQ-ezwJCdOyJHZV9mQh8FAz5qRF34U.apk";

// Fallback EAS build overview page
const EAS_BUILD_PAGE_URL =
  "https://expo.dev/accounts/bistacreation/projects/purplehaze-mobile/builds/9fcd415c-559f-4759-9477-4330f3004c10";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view");

  if (view === "build") {
    return NextResponse.redirect(EAS_BUILD_PAGE_URL, { status: 307 });
  }

  // Redirect directly to the standalone APK binary download
  return NextResponse.redirect(
    process.env.NEXT_PUBLIC_ANDROID_APK_URL || EAS_APK_DIRECT_URL,
    { status: 307 },
  );
}
