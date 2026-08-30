import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from "class-validator";
import { VehicleType } from "@motiq/types";

export class CreateVehicleDto {
  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  make!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  model!: string;

  @IsOptional()
  @IsInt()
  @Min(1980)
  @Max(new Date().getFullYear() + 1)
  year?: number;

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  plateNumber!: string;
}
