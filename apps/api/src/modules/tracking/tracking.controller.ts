import { Controller, ForbiddenException, Get, Param, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, UserRole } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { RequestService } from "../request/request.service";
import { MatchingService } from "../matching/matching.service";
import { RoutingService } from "./routing/routing.service";

/** Ch32/Ch54's real-driving-route feature — pulled by the mobile map on its
 * own coarse throttle (see RoutingService's doc comment), not pushed over
 * the WebSocket gateway. */
@Controller("tracking")
@UseGuards(JwtAuthGuard, RolesGuard)
export class TrackingController {
  constructor(
    private readonly routingService: RoutingService,
    private readonly requestService: RequestService,
    private readonly matchingService: MatchingService,
  ) {}

  // Same ownership discipline as RequestController.findOne()/PaymentController's
  // reads: a customer only ever sees their own request's route; a provider
  // only their own accepted job's. Admin/Support unrestricted, matching the
  // existing posture on other unscoped-for-now reads (docs/roadmap.md's
  // Reconciliation Notes).
  @Get("requests/:id/route")
  @Roles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPPORT)
  async getRoute(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const request = await this.requestService.findById(id);
    if (user.role === UserRole.CUSTOMER && request.customerProfileId !== user.profileId) {
      throw new ForbiddenException("You can only view the route for your own service requests.");
    }
    if (user.role === UserRole.PROVIDER) {
      const assignment = await this.matchingService.getAcceptedAssignment(id);
      if (assignment.providerProfileId !== user.profileId) {
        throw new ForbiddenException("You can only view the route for your own accepted jobs.");
      }
    }
    return this.routingService.getRouteForRequest(id);
  }
}
