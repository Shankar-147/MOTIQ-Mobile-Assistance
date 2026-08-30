import { IsEnum, IsOptional, IsString, MaxLength, MinLength } from "class-validator";
import { VehicleType } from "@motiq/types";

export class UpdateProviderFleetVehicleDto {
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  make?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  model?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  plateNumber?: string;
}
