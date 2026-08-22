import { IsOptional, IsString, MinLength } from "class-validator";

export class AdminLoginDto {
  @IsString()
  identifier!: string; // phone or email

  @IsString()
  @MinLength(8)
  password!: string;

  // Required only if the account has MFA enrolled (Ch93, ADR 0020).
  @IsOptional()
  @IsString()
  totpCode?: string;
}
