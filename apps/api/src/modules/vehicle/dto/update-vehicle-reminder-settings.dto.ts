import { Type } from "class-transformer";
import { IsArray, IsBoolean, IsEnum, IsInt, Max, Min, ValidateNested } from "class-validator";
import { MaintenanceServiceType } from "@motiq/types";

class VehicleReminderPreferenceInputDto {
  @IsEnum(MaintenanceServiceType)
  serviceType!: MaintenanceServiceType;

  @IsBoolean()
  enabled!: boolean;
}

export class UpdateVehicleReminderSettingsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VehicleReminderPreferenceInputDto)
  preferences!: VehicleReminderPreferenceInputDto[];

  @IsInt()
  @Min(1)
  @Max(60)
  leadTimeDays!: number;
}
