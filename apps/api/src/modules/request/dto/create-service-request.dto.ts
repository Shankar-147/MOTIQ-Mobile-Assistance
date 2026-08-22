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
  // customerProfileId is deliberately NOT a field here — Phase 1 (ADR 0011)
  // made it come from the authenticated session (@CurrentUser() in the
  // controller), never from client input. See docs/roadmap.md Phase 1.
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
