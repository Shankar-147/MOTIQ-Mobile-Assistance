import { Body, Controller, ForbiddenException, Get, Param, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, UserRole } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { RequestService } from "./request.service";
import { CreateServiceRequestDto } from "./dto/create-service-request.dto";

@Controller("requests")
@UseGuards(JwtAuthGuard, RolesGuard)
export class RequestController {
  constructor(private readonly requestService: RequestService) {}

  @Post()
  @Roles(UserRole.CUSTOMER)
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateServiceRequestDto) {
    return this.requestService.create(user.profileId, dto);
  }

  @Get(":id")
  @Roles(UserRole.CUSTOMER, UserRole.PROVIDER, UserRole.ADMIN, UserRole.SUPPORT)
  async findOne(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    const request = await this.requestService.findById(id);
    // Data-access-layer scoping (Ch51, CLAUDE.md rule 8): a customer may only
    // read their own requests — role alone (checked by RolesGuard above)
    // isn't sufficient. Provider/Admin/Support access is unrestricted here
    // in this bootstrap phase; a real Assignment-based check for providers
    // is Phase 2's job (Ch53's Matching engine owns that relationship).
    if (user.role === UserRole.CUSTOMER && request.customerProfileId !== user.profileId) {
      throw new ForbiddenException("You can only view your own service requests.");
    }
    return request;
  }
}
