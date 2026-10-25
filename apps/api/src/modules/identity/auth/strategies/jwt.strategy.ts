import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import type { AuthenticatedUser } from "@motiq/types";
import { PrismaService } from "../../../../common/prisma/prisma.service";
import { JwtPayload } from "../jwt-payload.interface";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, "jwt") {
  constructor(
    config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.getOrThrow<string>("JWT_ACCESS_SECRET"),
    });
  }

  // Whatever this returns becomes req.user (CLAUDE.md: never trust a client-
  // supplied profileId/role after this point — this is the one place they're
  // established, from a signed token, not from request input). Also the
  // enforcement point for admin-triggered account suspension (Ch61): a
  // deactivated account's still-valid, unexpired access token is rejected on
  // every subsequent request, not just at its next login.
  async validate(payload: JwtPayload): Promise<AuthenticatedUser> {
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { isActive: true },
    });
    if (!user || !user.isActive) {
      throw new UnauthorizedException("This account has been deactivated.");
    }
    return { userId: payload.sub, role: payload.role, profileId: payload.profileId };
  }
}
