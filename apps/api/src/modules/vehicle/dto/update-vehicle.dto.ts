import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { VehicleType } from "@motiq/types";

export class UpdateVehicleDto {
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
  @IsInt()
  @Min(1980)
  @Max(new Date().getFullYear() + 1)
  year?: number;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(20)
  plateNumber?: string;
}
