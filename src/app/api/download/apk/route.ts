import { NextResponse } from "next/server";

// Direct standalone Android APK download artifact URL from EAS Build
const EAS_APK_DIRECT_URL =
  "https://expo.dev/artifacts/eas/uJhc7SaVgmsushqrd8EFb5EC5thiV0zjcACDtd9fbkw.apk";

// Fallback EAS build overview page
const EAS_BUILD_PAGE_URL =
  "https://expo.dev/accounts/bistacreation/projects/purplehaze-mobile/builds/0a9c4e41-1f0d-4457-ae53-72edec68adb5";

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
