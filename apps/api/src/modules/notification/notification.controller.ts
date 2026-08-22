import { Body, Controller, Get, Patch, Post, UseGuards } from "@nestjs/common";
import { AuthenticatedUser } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { NotificationService } from "./notification.service";
import { RegisterDeviceTokenDto } from "./dto/register-device-token.dto";
import { UpdateNotificationPreferenceDto } from "./dto/update-notification-preference.dto";

/**
 * Ch70's device-registration endpoint and Ch59's preference endpoints — open
 * to any authenticated role (Customer, Provider, Admin, Support all receive
 * notifications), so only JwtAuthGuard applies, no @Roles() restriction.
 */
@Controller("notifications")
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notifications: NotificationService) {}

  @Post("device-tokens")
  registerDeviceToken(@CurrentUser() user: AuthenticatedUser, @Body() dto: RegisterDeviceTokenDto) {
    return this.notifications.registerDeviceToken(user.userId, dto.token, dto.platform);
  }

  @Get("preferences")
  getOwnPreferences(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.getOwnPreference(user.userId);
  }

  @Patch("preferences")
  updateOwnPreferences(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateNotificationPreferenceDto) {
    return this.notifications.updatePreference(user.userId, dto);
  }
}
