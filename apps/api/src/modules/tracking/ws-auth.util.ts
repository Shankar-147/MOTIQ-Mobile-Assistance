import { UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import type { Socket } from "socket.io";
import type { AuthenticatedUser } from "@motiq/types";
import type { JwtPayload } from "../identity/auth/jwt-payload.interface";

/**
 * Ch75: WebSocket connections authenticate once, at handshake time (see
 * TrackingGateway.handleConnection) — not per-message. Passport's
 * AuthGuard('jwt') (ADR 0011) is built for HTTP requests and doesn't apply
 * to a Socket.IO handshake, so this verifies the same access token directly
 * against the same JwtService/secret instead of duplicating auth logic.
 */
export function authenticateSocket(client: Socket, jwtService: JwtService): AuthenticatedUser {
  const token = extractToken(client);
  if (!token) {
    throw new UnauthorizedException("Missing auth token on WebSocket connection.");
  }
  try {
    const payload = jwtService.verify<JwtPayload>(token);
    return { userId: payload.sub, role: payload.role, profileId: payload.profileId };
  } catch {
    throw new UnauthorizedException("Invalid or expired WebSocket auth token.");
  }
}

function extractToken(client: Socket): string | undefined {
  const authToken = client.handshake.auth?.token as string | undefined;
  if (authToken) {
    return authToken;
  }
  const header = client.handshake.headers.authorization;
  if (header?.startsWith("Bearer ")) {
    return header.slice("Bearer ".length);
  }
  return undefined;
}
