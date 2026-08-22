import { UserRole } from "@motiq/types";

/**
 * Mirrors apps/api's JwtPayload (jwt-payload.interface.ts) — kept in sync by
 * hand, not shared via packages/types, since it's a server-internal token
 * shape rather than a formal wire DTO. This decode is for UI routing only
 * (which navigator to show); it never substitutes for server-side
 * verification, which every protected endpoint still enforces independently.
 */
export interface DecodedAccessToken {
  sub: string;
  role: UserRole;
  profileId: string;
  iat: number;
  exp: number;
}

const BASE64_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/**
 * Hermes (React Native's JS engine) has no built-in atob/btoa, and this
 * project deliberately avoids pulling in a polyfill package just for a
 * client-side, non-security-critical JWT payload read.
 */
function base64Decode(input: string): string {
  let output = "";
  let buffer = 0;
  let bitsCollected = 0;
  for (const char of input) {
    if (char === "=") break;
    const value = BASE64_CHARS.indexOf(char);
    if (value === -1) continue;
    buffer = (buffer << 6) | value;
    bitsCollected += 6;
    if (bitsCollected >= 8) {
      bitsCollected -= 8;
      output += String.fromCharCode((buffer >> bitsCollected) & 0xff);
    }
  }
  return output;
}

export function decodeAccessTokenPayload(accessToken: string): DecodedAccessToken {
  const payloadSegment = accessToken.split(".")[1];
  if (!payloadSegment) {
    throw new Error("Malformed access token — no payload segment.");
  }
  const base64 = payloadSegment.replace(/-/g, "+").replace(/_/g, "/");
  return JSON.parse(base64Decode(base64)) as DecodedAccessToken;
}
