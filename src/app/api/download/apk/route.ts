import { NextResponse } from "next/server";

// Direct standalone Android APK download artifact URL from EAS Build
const EAS_APK_DIRECT_URL =
  "https://expo.dev/artifacts/eas/vB7W3ctKbP4-VL-mkh5cOox2BAFsY9YwGBIC-X26Gs4.apk";

// Fallback EAS build overview page
const EAS_BUILD_PAGE_URL =
  "https://expo.dev/accounts/bistacreation/projects/purplehaze-mobile/builds/4cb25f18-b061-43d1-9be3-b7e253216b19";

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
