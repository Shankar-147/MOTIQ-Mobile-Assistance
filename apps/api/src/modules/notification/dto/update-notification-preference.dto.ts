import { IsBoolean, IsInt, IsOptional, Max, Min } from "class-validator";

export class UpdateNotificationPreferenceDto {
  @IsOptional()
  @IsBoolean()
  smsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  pushEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  quietHoursStartHour?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(23)
  quietHoursEndHour?: number;
}
