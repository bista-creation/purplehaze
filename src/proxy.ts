import { NextResponse } from "next/server";
import { auth } from "@/auth";

export default auth((request) => {
  const { pathname, search } = request.nextUrl;
  const user = request.auth?.user;

  const isAccount = pathname.startsWith("/account");
  const isAdmin = pathname.startsWith("/admin");

  if ((isAccount || isAdmin) && !user) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (
    isAdmin &&
    user?.role !== "ADMIN" &&
    user?.role !== "STAFF"
  ) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/account/:path*", "/admin/:path*"],
};
