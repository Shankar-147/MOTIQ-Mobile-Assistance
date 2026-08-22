import { Type } from "class-transformer";
import { IsArray, IsEnum, IsOptional, IsString, ValidateNested } from "class-validator";
import { ServiceAreaLaunchPhase } from "@motiq/types";

class GeoPointDto {
  latitude!: number;
  longitude!: number;
}

export class CreateServiceAreaDto {
  @IsString()
  name!: string;

  @IsOptional()
  @IsEnum(ServiceAreaLaunchPhase)
  launchPhase?: ServiceAreaLaunchPhase;

  /** Closed ring (first point == last point). Optional — a city can be created before its coverage boundary is finalized. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => GeoPointDto)
  boundary?: GeoPointDto[];
}
