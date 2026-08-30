import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

/** Ch61's admin manual dispatch override — see MatchingService.adminOverrideDispatch(). */
export class DispatchOverrideDto {
  @IsUUID()
  providerProfileId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
