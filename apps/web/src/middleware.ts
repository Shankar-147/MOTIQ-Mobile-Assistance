import { NextRequest, NextResponse } from "next/server";
import { ACCESS_TOKEN_COOKIE } from "./lib/session";

export function middleware(request: NextRequest) {
  const accessToken = request.cookies.get(ACCESS_TOKEN_COOKIE)?.value;
  const isLoginPage = request.nextUrl.pathname.startsWith("/login");
  // The live presentation demo (/demo) talks to the API on its own demo-only
  // sign-in and never touches the admin session, so it is reachable without one.
  if (request.nextUrl.pathname.startsWith("/demo")) {
    return NextResponse.next();
  }

  if (!accessToken && !isLoginPage) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (accessToken && isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
