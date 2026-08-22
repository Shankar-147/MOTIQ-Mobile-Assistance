import { Type } from "class-transformer";
import { IsEnum, IsNumber, IsOptional, IsString, IsUUID, ValidateNested } from "class-validator";
import { IssueType } from "@motiq/types";

class GeoPointDto {
  @IsNumber()
  latitude!: number;

  @IsNumber()
  longitude!: number;
}

export class CreateServiceRequestDto {
  // TODO(Ch33): once auth is implemented, derive this from the authenticated
  // session's auth context instead of accepting it from the client directly.
  @IsUUID()
  customerProfileId!: string;

  @IsUUID()
  serviceAreaId!: string;

  @IsEnum(IssueType)
  issueType!: IssueType;

  @ValidateNested()
  @Type(() => GeoPointDto)
  pickupLocation!: GeoPointDto;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsUUID()
  vehicleId?: string;
}
