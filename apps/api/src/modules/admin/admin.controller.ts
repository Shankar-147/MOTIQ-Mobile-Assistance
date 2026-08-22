import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, UserRole } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { AdminService } from "./admin.service";
import { ReviewVerificationDocumentDto } from "./dto/review-verification-document.dto";
import { UpdateVerificationStatusDto } from "./dto/update-verification-status.dto";

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
}
