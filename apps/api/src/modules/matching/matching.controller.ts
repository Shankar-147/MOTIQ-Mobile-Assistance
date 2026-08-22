import { Body, Controller, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, UserRole } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { MatchingService } from "./matching.service";
import { AdvanceJobStatusDto } from "./dto/advance-job-status.dto";

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class MatchingController {
  constructor(private readonly matchingService: MatchingService) {}

  @Post("assignments/:id/accept")
  @Roles(UserRole.PROVIDER)
  accept(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.matchingService.acceptOffer(id, user.profileId);
  }

  @Post("assignments/:id/reject")
  @Roles(UserRole.PROVIDER)
  reject(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.matchingService.rejectOffer(id, user.profileId);
  }

  // PROVIDER_EN_ROUTE -> ARRIVED -> SERVICE_IN_PROGRESS -> COMPLETED (or
  // CANCELLED_BY_PROVIDER) — validated against Ch19's state machine inside
  // RequestService.transition(); this endpoint only adds the "does this
  // provider actually hold the accepted assignment" ownership check.
  @Patch("assignments/:id/job-status")
  @Roles(UserRole.PROVIDER)
  advanceJobStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: AdvanceJobStatusDto,
  ) {
    return this.matchingService.advanceJobStatus(id, user.profileId, dto.status);
  }

  // Manual stand-in for Ch62's future recurring background job — see
  // MatchingService.sweepExpiredOffers()'s doc comment.
  @Post("matching/sweep-expired")
  @Roles(UserRole.ADMIN)
  sweepExpired() {
    return this.matchingService.sweepExpiredOffers();
  }
}
