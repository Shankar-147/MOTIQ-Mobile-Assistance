import { IsEnum, IsOptional, IsString, IsUUID, Matches } from "class-validator";
import { UserRole } from "@motiq/types";

const PHONE_PATTERN = /^\+?[1-9]\d{9,14}$/;
const OTP_CODE_PATTERN = /^\d{6}$/;

/**
 * Registration fields are optional at the DTO level and required-if-new-user
 * at the service level (AuthService.verifyOtp) — see its "why not
 * @ValidateIf" note. Only CUSTOMER/PROVIDER can self-register this way;
 * ADMIN/SUPPORT accounts are provisioned out of band (see prisma/seed.ts).
 */
export class VerifyOtpDto {
  @Matches(PHONE_PATTERN)
  phone!: string;

  @Matches(OTP_CODE_PATTERN)
  code!: string;

  @IsOptional()
  @IsEnum([UserRole.CUSTOMER, UserRole.PROVIDER])
  role?: UserRole.CUSTOMER | UserRole.PROVIDER;

  @IsOptional()
  @IsString()
  displayName?: string;

  @IsOptional()
  @IsString()
  businessName?: string;

  @IsOptional()
  @IsUUID()
  serviceAreaId?: string;
}
