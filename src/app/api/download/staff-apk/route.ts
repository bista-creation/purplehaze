import { NextResponse } from "next/server";

const STAFF_APK_RELEASE_URL =
  "https://github.com/bista-creation/purple_app/releases/latest/download/purple-haze-operations.apk";
const STAFF_RELEASES_PAGE_URL =
  "https://github.com/bista-creation/purple_app/releases";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  if (searchParams.get("view") === "releases") {
    return NextResponse.redirect(STAFF_RELEASES_PAGE_URL, { status: 307 });
  }

  return NextResponse.redirect(
    process.env.NEXT_PUBLIC_STAFF_APK_URL || STAFF_APK_RELEASE_URL,
    { status: 307 },
  );
}
