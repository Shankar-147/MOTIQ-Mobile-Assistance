import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
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
}
