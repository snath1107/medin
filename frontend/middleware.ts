import { NextRequest, NextResponse } from "next/server";

// Pages anyone can open without logging in.
const PUBLIC_PAGES = ["/signin", "/signup"];

/**
 * Runs before every page load. It only checks that the login cookie exists, which is
 * enough to decide where to send the user. The backend checks the token is actually
 * valid on every API call (and the frontend goes to /signin if it isn't).
 */
export function middleware(request: NextRequest) {
  const isLoggedIn = request.cookies.has("access_token");
  const isPublicPage = PUBLIC_PAGES.some((page) => request.nextUrl.pathname.startsWith(page));

  if (!isLoggedIn && !isPublicPage) {
    return NextResponse.redirect(new URL("/signin", request.url));
  }

  if (isLoggedIn && isPublicPage) {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Skip API calls, Next.js internals and static files.
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
