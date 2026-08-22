import { IsEnum } from "class-validator";
import { ProviderVerificationStatus } from "@motiq/types";

export class UpdateVerificationStatusDto {
  @IsEnum(ProviderVerificationStatus)
  status!: ProviderVerificationStatus;
}
