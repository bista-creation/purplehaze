import { NextResponse } from "next/server";

// Fallback direct build URL on Expo Application Services
const EAS_BUILD_URL =
  "https://expo.dev/accounts/bistacreation/projects/purplehaze-mobile/builds/c8ad9dc1-2da0-4919-88cd-84dc009a718f";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const direct = searchParams.get("direct");

  // If a direct artifact URL is known or environment variable is set
  const artifactUrl = process.env.NEXT_PUBLIC_ANDROID_APK_URL;

  if (artifactUrl && direct) {
    return NextResponse.redirect(artifactUrl, { status: 307 });
  }

  // Redirect to official build download page or artifact
  return NextResponse.redirect(artifactUrl || EAS_BUILD_URL, { status: 307 });
}
