import { Body, Controller, ForbiddenException, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, ConsentType, RequestStatus, UserRole } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { ConsentService } from "../consent/consent.service";
import { RequestService } from "./request.service";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";

@Controller("requests")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestController {
  constructor(
    private readonly requestService: RequestService,
    private readonly consentService: ConsentService,
  ) {}

  // Ch128 — a request always carries a pickupLocation, so creating one IS
  // location collection; the consent gate lives here rather than inside
  // RequestService, since AuthenticatedUser.userId (the consent key) is
  // only naturally available at the controller layer.
  @Post()
  @Roles(UserRole.CUSTOMER)
  async create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateServiceRequestDto) {
    await this.consentService.requireConsent(user.userId, ConsentType.LOCATION_TRACKING);
    return this.requestService.create(user.profileId, dto);
  }

  @Get(":id")
  @Roles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPPORT)
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const request = await this.requestService.findById(id);
    // Data-access-layer scoping (Ch51, CLAUDE.md rule 8): a customer may only
    // read their own requests — role alone (checked by RolesGuard above)
    // isn't sufficient. Provider/Admin/Support access is unrestricted here
    // in this bootstrap phase — see docs/roadmap.md's Reconciliation Notes.
    if (user.role === UserRole.CUSTOMER && request.customerProfileId !== user.profileId) {
      throw new ForbiddenException("You can only view your own service requests.");
    }
    return request;
  }

  // The provider-side equivalent (PROVIDER_EN_ROUTE -> ... -> COMPLETED /
  // CANCELLED_BY_PROVIDER) lives on MatchingController, keyed by assignment —
  // see docs/decisions/0013-*.md for why cancellation and job-progress are
  // split across two controllers rather than both living here.
  @Patch(":id/cancel")
  @Roles(UserRole.CUSTOMER)
  async cancel(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const request = await this.requestService.findById(id);
    if (request.customerProfileId !== user.profileId) {
      throw new ForbiddenException("You can only cancel your own service requests.");
    }
    return this.requestService.transition(id, RequestStatus.CANCELLED_BY_CUSTOMER);
  }
}
