import { IsEnum, IsOptional, IsString } from "class-validator";
import { SosAlertStatus } from "@motiq/types";

export class ResolveSosAlertDto {
  @IsEnum([SosAlertStatus.RESOLVED, SosAlertStatus.FALSE_ALARM])
  outcome!: SosAlertStatus.RESOLVED | SosAlertStatus.FALSE_ALARM;

  @IsOptional()
  @IsString()
  notes?: string;
}
