import { Body, Controller, Delete, HttpCode, HttpStatus, Post, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { AuthenticatedUser, UserRole } from "@motiq/types";
import { AuthService } from "./auth.service";
import { RequestOtpDto } from "./dto/request-otp.dto";
import { VerifyOtpDto } from "./dto/verify-otp.dto";
import { AdminLoginDto } from "./dto/admin-login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { ConfirmMfaEnrollmentDto } from "./dto/confirm-mfa-enrollment.dto";
import { CurrentUser } from "./decorators/current-user.decorator";
import { JwtAuthGuard } from "./guards/jwt-auth.guard";
import { Roles } from "./decorators/roles.decorator";
import { RolesGuard } from "./guards/roles.guard";

@Controller("auth")
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Ch95 — tighter than the global default: a phone number is otherwise an
  // easy target for OTP-request spam (cost/annoyance to the number's owner)
  // and this is on top of AuthService's own per-phone resend cooldown.
  @Post("otp/request")
  @HttpCode(HttpStatus.NO_CONTENT)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async requestOtp(@Body() dto: RequestOtpDto): Promise<void> {
    await this.authService.requestOtp(dto);
  }

  @Post("otp/verify")
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  @Post("admin/login")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  adminLogin(@Body() dto: AdminLoginDto) {
    return this.authService.adminLogin(dto);
  }

  @Post("refresh")
  refresh(@Body() dto: RefreshTokenDto) {
    return this.authService.refresh(dto);
  }

  // Ch93 MFA enrollment — protected, since an admin must already be logged
  // in (with their password) before they can start enrolling a second factor.
  @Post("admin/mfa/enroll")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  startMfaEnrollment(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.startMfaEnrollment(user.userId);
  }

  @Post("admin/mfa/confirm")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  confirmMfaEnrollment(@CurrentUser() user: AuthenticatedUser, @Body() dto: ConfirmMfaEnrollmentDto) {
    return this.authService.confirmMfaEnrollment(user.userId, dto.code);
  }

  @Delete("admin/mfa")
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPPORT)
  disableMfa(@CurrentUser() user: AuthenticatedUser) {
    return this.authService.disableMfa(user.userId);
  }
}
