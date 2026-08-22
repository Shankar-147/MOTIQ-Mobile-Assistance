import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AuthenticatedUser } from "@motiq/types";
import { JwtPayload } from "../jwt-payload.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  // Whatever this returns becomes req.user (CLAUDE.md: never trust a client-
  // supplied profileId/role after this point — this is the one place they're
  // established, from a signed token, not from request input).
  validate(payload: JwtPayload): AuthenticatedUser {
    return { userId: payload.sub, role: payload.role, profileId: payload.profileId };
  }
}
