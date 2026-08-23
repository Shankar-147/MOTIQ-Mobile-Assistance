import { Body, Controller, Get, Param, Patch, Post, UseGuards } from "@nestjs/common";
import { SkipThrottle } from "@nestjs/throttler";
import { AuthenticatedUser, UserRole } from "@motiq/types";
import { CurrentUser } from "../identity/auth/decorators/current-user.decorator";
import { JwtAuthGuard } from "../identity/auth/guards/jwt-auth.guard";
import { Roles } from "../identity/auth/decorators/roles.decorator";
import { RolesGuard } from "../identity/auth/guards/roles.guard";
import { SosService } from "./sos.service";
import { TriggerSosDto } from "./dto/trigger-sos.dto";
import { ResolveSosAlertDto } from "./dto/resolve-sos-alert.dto";

@Controller("sos")
@UseGuards(JwtAuthGuard, RolesGuard)
export class SosController {
  constructor(private readonly sosService: SosService) {}

  // Ch55, binding: rate-limiting must never delay a genuine trigger — this
  // route is explicitly exempted from the global per-user limiter (ADR
  // 0020), and deliberately does NOT gate on ConsentService.requireConsent()
  // either, for the same reason (an emergency must never wait on a consent
  // prompt). See ADR 0021.
  @Post("trigger")
  @SkipThrottle()
  @Roles(UserRole.CUSTOMER, UserRole.PROVIDER)
  trigger(@CurrentUser() user: AuthenticatedUser, @Body() dto: TriggerSosDto) {
    return this.sosService.trigger({
      triggeredByUserId: user.userId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      serviceRequestId: dto.serviceRequestId,
      source: "MOBILE_BUTTON",
    });
  }

  @Get("alerts")
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  listAlerts() {
    return this.sosService.listAlerts();
  }

  @Patch("alerts/:id/acknowledge")
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  acknowledge(@CurrentUser() user: AuthenticatedUser, @Param("id") id: string) {
    return this.sosService.acknowledge(id, user.userId);
  }

  @Patch("alerts/:id/resolve")
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  resolve(@Param("id") id: string, @Body() dto: ResolveSosAlertDto) {
    return this.sosService.resolve(id, dto.outcome, dto.notes);
  }
}
