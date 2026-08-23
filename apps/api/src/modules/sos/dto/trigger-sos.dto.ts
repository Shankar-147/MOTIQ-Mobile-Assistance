import { IsLatitude, IsLongitude, IsOptional, IsUUID } from "class-validator";

export class TriggerSosDto {
  // Optional — the AI Assistant's emergency pre-filter (Ch90) can trigger an
  // alert with no known location; a real device-triggered alert should
  // always send one when possible.
  @IsOptional()
  @IsLatitude()
  latitude?: number;

  @IsOptional()
  @IsLongitude()
  longitude?: number;

  @IsOptional()
  @IsUUID()
  serviceRequestId?: string;
}
