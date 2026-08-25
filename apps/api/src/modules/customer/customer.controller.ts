import { Body, Controller, Get, Patch, UseGuards } from "@nestjs/common";
import { AuthenticatedUser, UserRole } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { CustomerService } from "./customer.service";
import { UpdateCustomerProfileDto } from "./dto/update-customer-profile.dto";

@Controller("customers")
@UseGuards(JwtAuthGuard, RolesGuard)
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Get("me")
  @Roles(UserRole.CUSTOMER)
  getOwnProfile(@CurrentUser() user: AuthenticatedUser) {
    return this.customerService.findById(user.profileId);
  }

  @Patch("me")
  @Roles(UserRole.CUSTOMER)
  updateOwnProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateCustomerProfileDto) {
    return this.customerService.updateOwnProfile(user.profileId, dto);
  }
}
