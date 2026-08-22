import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, ValidateNested } from "class-validator";
import { PresenceStatus } from "@motiq/types";

class GeoPointDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;
}

export class UpdatePresenceDto {
  @IsEnum(PresenceStatus)
  presenceStatus!: PresenceStatus;

  @IsOptional()
  @ValidateNested()
  @Type(() => GeoPointDto)
  location?: GeoPointDto;
}
