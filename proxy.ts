import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  const accessToken = request.cookies.get("access_token")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;

  const isAuthPage = PUBLIC_PAGES.some((page) => pathname.startsWith(page));
  const isAuthenticated = Boolean(accessToken || refreshToken);

  if (isAuthPage && isAuthenticated) {
    return NextResponse.redirect(new URL("/tesoreria", request.url));
  }

  if (isAuthPage) {
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
