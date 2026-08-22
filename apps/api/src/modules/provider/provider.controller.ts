import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, UserRole } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { ProviderService } from "./provider.service";
import { UpdatePresenceDto } from "./dto/update-presence.dto";
import { SubmitVerificationDocumentDto } from "./dto/submit-verification-document.dto";

@Controller("providers")
@UseGuards(JwtAuthGuard, RolesGuard)
export class ProviderController {
  constructor(private readonly providerService: ProviderService) {}

  @Patch("me/presence")
  @Roles(UserRole.PROVIDER)
  updateOwnPresence(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdatePresenceDto) {
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
