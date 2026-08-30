import { IsEnum, IsString, MaxLength, MinLength } from "class-validator";
import { VehicleType } from "@motiq/types";

export class CreateProviderFleetVehicleDto {
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

  @IsString()
  @MinLength(1)
  @MaxLength(20)
  plateNumber!: string;
}
