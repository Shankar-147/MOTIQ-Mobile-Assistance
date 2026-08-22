import { Controller, Delete, Get, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, ConsentType } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { ConsentService } from "./consent.service";

/**
 * Ch128 — a fixed route per consent type rather than a generic `:type`
 * param, since there is exactly one consent type today (LOCATION_TRACKING);
 * add a route the same way if/when a second one is needed, rather than
 * building a generic mechanism for a single case.
 */
@Controller("consent")
@UseGuards(JwtAuthGuard)
export class ConsentController {
  constructor(private readonly consentService: ConsentService) {}

  @Get()
  listOwn(@CurrentUser() user: AuthenticatedUser) {
    return this.consentService.listOwn(user.userId);
  }

  @Post("location-tracking")
  grantLocationTracking(@CurrentUser() user: AuthenticatedUser) {
    return this.consentService.grant(user.userId, ConsentType.LOCATION_TRACKING);
  }

  @Delete("location-tracking")
  revokeLocationTracking(@CurrentUser() user: AuthenticatedUser) {
    return this.consentService.revoke(user.userId, ConsentType.LOCATION_TRACKING);
  }
}
