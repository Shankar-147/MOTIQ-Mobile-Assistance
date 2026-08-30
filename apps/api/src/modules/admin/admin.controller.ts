import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, UserRole } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { AdminService } from "./admin.service";
import { ReviewVerificationDocumentDto } from "./dto/review-verification-document.dto";
import { UpdateVerificationStatusDto } from "./dto/update-verification-status.dto";
import { DispatchOverrideDto } from "./dto/dispatch-override.dto";

/** Ch61's Admin & Operations Service — the provider-verification workflow
 * backend (Ch98). Document review is Admin|Support (day-to-day ops); tier
 * transitions (suspend/delist/reinstate) are Admin-only, a higher-stakes
 * action than reviewing one document. */
@Controller("admin")
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get("providers/verification-documents")
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  listPendingVerificationDocuments() {
    return this.adminService.listPendingVerificationDocuments();
  }

  // Ch137's Admin Console needs a way to browse providers to find one to act
  // on, outside the pending-documents queue.
  @Get("providers")
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  listProviders(
    @Query("serviceAreaId") serviceAreaId?: string,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    return this.adminService.listProviders({ serviceAreaId, cursor, limit: limit ? Number(limit) : undefined });
  }

  @Get("audit-log")
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  listAuditLog(@Query("cursor") cursor?: string, @Query("limit") limit?: string) {
    return this.adminService.listAuditLog({ cursor, limit: limit ? Number(limit) : undefined });
  }

  @Patch("providers/verification-documents/:id/review")
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  reviewVerificationDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: ReviewVerificationDocumentDto,
  ) {
    return this.adminService.reviewVerificationDocument(id, user.userId, dto.decision, dto.notes);
  }

  @Patch("providers/:id/verification-status")
  @Roles(UserRole.ADMIN)
  updateProviderVerificationStatus(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: UpdateVerificationStatusDto,
  ) {
    return this.adminService.updateProviderVerificationStatus(id, user.userId, dto.status);
  }

  // Manual stand-in for Ch62's future recurring scheduler — see
  // ProviderService.sweepLapsedVerifications()'s doc comment.
  @Post("providers/verification-sweep")
  @Roles(UserRole.ADMIN)
  sweepLapsedVerifications(@CurrentUser() user: AuthenticatedUser) {
    return this.adminService.sweepLapsedProviderVerifications(user.userId);
  }

  // Ch61/Ch137's manual-dispatch queue — requests automated matching either
  // hasn't resolved yet or gave up on.
  @Get("requests/needing-dispatch")
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  listRequestsNeedingDispatch(@Query("cursor") cursor?: string, @Query("limit") limit?: string) {
    return this.adminService.listRequestsNeedingDispatch({ cursor, limit: limit ? Number(limit) : undefined });
  }

  // Ch61's admin manual dispatch override — a higher-stakes action than
  // reviewing a document (it moves real money/ops flow), Admin-only, same
  // posture as verification-status transitions above.
  @Post("requests/:id/dispatch-override")
  @Roles(UserRole.ADMIN)
  dispatchOverride(
    @CurrentUser() user: AuthenticatedUser,
    @Param("id") id: string,
    @Body() dto: DispatchOverrideDto,
  ) {
    return this.adminService.dispatchOverride(id, dto.providerProfileId, user.userId, dto.reason);
  }
}
