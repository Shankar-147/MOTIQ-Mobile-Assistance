import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, ConsentType, UserRole } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { ConsentService } from "../consent/consent.service";
import { ProviderService } from "./provider.service";
import { UpdatePresenceDto } from "./dto/update-presence.dto";
import { SubmitVerificationDocumentDto } from "./dto/submit-verification-document.dto";

@Controller("providers")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProviderController {
  constructor(
    private readonly providerService: ProviderService,
    private readonly consentService: ConsentService,
  ) {}

  // Ch72's mobile Provider app Home/Profile screens — a provider reading
  // their own tier, trust score, and stats.
  @Get("me")
  @Roles(UserRole.PROVIDER)
  getOwnProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.providerService.findById(user.profileId);
  }

  // Ch72's mobile Provider app job-history screen.
  @Get("me/jobs")
  @Roles(UserRole.PROVIDER)
  listOwnJobs(
    @CurrentUser() user: AuthenticatedUser,
    @Query("cursor") cursor?: string,
    @Query("limit") limit?: string,
  ) {
    return this.providerService.listOwnJobs(user.profileId, {
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }

  // Ch71's mobile Customer app tracking screen — a customer looking up the
  // provider assigned to their request. Deliberately open to any
  // authenticated role, same posture as the other findOne()-style reads in
  // this bootstrap phase (see docs/roadmap.md's Reconciliation Notes on
  // ownership checks not being built out everywhere yet); the payload
  // itself is already scoped down to non-sensitive fields (findPublicById).
  @Get(":id/public")
  @Roles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPPORT)
  getPublicProfile(@Param("id") id: string) {
    return this.providerService.findPublicById(id);
  }

  // Ch128 — gated only when this update actually carries a location (going
  // online/updating position); toggling OFFLINE with no location never needs it.
  @Patch("me/presence")
  @Roles(UserRole.PROVIDER)
  async updateOwnPresence(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePresenceDto) {
    if (dto.location) {
      await this.consentService.requireConsent(user.userId, ConsentType.LOCATION_TRACKING);
    }
    return this.providerService.setPresence(user.profileId, dto.presenceStatus, dto.location);
  }

  // Ch98's KYC submission — review/tier decisions are Admin-only (Ch61),
  // see AdminController.
  @Post("me/verification-documents")
  @Roles(UserRole.PROVIDER)
  submitVerificationDocument(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: SubmitVerificationDocumentDto,
  ) {
    return this.providerService.submitVerificationDocument(
      user.profileId,
      dto.documentType,
      dto.fileUrl,
    );
  }

  @Get("me/verification-documents")
  @Roles(UserRole.PROVIDER)
  listOwnVerificationDocuments(@CurrentUser() user: AuthenticatedUser) {
    return this.providerService.listOwnVerificationDocuments(user.profileId);
  }

  // The trust-score ML training-data export — see
  // ProviderService.listTrustSnapshots()'s doc comment.
  @Get("training-data/trust-snapshots")
  @Roles(UserRole.ADMIN)
  listTrustSnapshots(@Query("cursor") cursor?: string, @Query("limit") limit?: string) {
    return this.providerService.listTrustSnapshots({
      cursor,
      limit: limit ? Number(limit) : undefined,
    });
  }
}
