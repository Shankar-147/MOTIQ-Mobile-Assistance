import { UserRole } from "@motiq/types";

/** The access token's claims (Ch33). Kept minimal on purpose — anything else
 * a request handler needs should come from a DB lookup, not be smuggled
 * into the token. */
export interface JwtPayload {
  sub: string; // userId
  role: UserRole;
  profileId: string;
}
