import { IsDateString, IsNumber, IsUUID, Max, Min } from "class-validator";

/** Ch34: commission is configuration/data, never a code constant. See ADR 0003. */
export class CreateCommissionRateDto {
  @IsUUID()
  serviceAreaId!: string;

  @IsNumber()
  @Min(0)
  @Max(100)
  ratePercentage!: number;

  @IsDateString()
  effectiveFrom!: string;
}
