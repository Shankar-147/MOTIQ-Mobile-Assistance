import { IsDateString, IsNumber, IsOptional, IsUUID, Min } from "class-validator";

/** Ch34: fare constants are configuration/data, never code constants. See ADR 0012. */
export class CreateFareConfigDto {
  @IsUUID()
  serviceAreaId!: string;

  @IsNumber()
  @Min(0)
  baseFare!: number;

  @IsNumber()
  @Min(0)
  perKmRate!: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  maxSurgeMultiplier?: number;

  @IsDateString()
  effectiveFrom!: string;
}
