import { IsEnum, IsInt, IsOptional, IsPositive, IsString, MaxLength } from "class-validator";
import { MaintenanceServiceType } from "@motiq/types";

export class CreateMaintenanceRecordDto {
  @IsEnum(MaintenanceServiceType)
  serviceType!: MaintenanceServiceType;

  @IsInt()
  @IsPositive()
  odometerKm!: number;

  @IsOptional()
  @IsString()
  @MaxLength(12)
  cost?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
