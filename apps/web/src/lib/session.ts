import { cookies } from "next/headers";

/**
 * Ch137's Admin Console session — a server-only BFF cookie pair, never
 * exposed to client JS (httpOnly). Deliberately no silent-refresh-on-401
 * inside Server Components: React Server Components can read cookies but
 * not write them mid-render, so a Server Component whose fetch 401s just
 * redirects to /login rather than attempting an in-flight token refresh.
 * With a 15-minute access-token TTL, this means an admin re-authenticates
 * every 15 minutes of active use — a known, honest MVP limitation, not a
 * silently-assumed "it just works" refresh flow. See docs/roadmap.md.
 */
export const ACCESS_TOKEN_COOKIE = "motiq_access_token";
export const REFRESH_TOKEN_COOKIE = "motiq_refresh_token";

export function setSessionCookies(accessToken: string, refreshToken: string, expiresInSeconds: number) {
  const secure = process.env.NODE_ENV === "production";
  cookies().set(ACCESS_TOKEN_COOKIE, accessToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: expiresInSeconds,
  });
  cookies().set(REFRESH_TOKEN_COOKIE, refreshToken, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30d, matches JWT_REFRESH_TTL's default
  });
}

export function clearSessionCookies() {
  cookies().delete(ACCESS_TOKEN_COOKIE);
  cookies().delete(REFRESH_TOKEN_COOKIE);
}

export function getAccessToken(): string | undefined {
  return cookies().get(ACCESS_TOKEN_COOKIE)?.value;
}
