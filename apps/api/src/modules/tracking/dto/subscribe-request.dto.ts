import { IsUUID } from "class-validator";

export class SubscribeRequestDto {
  @IsUUID()
  serviceRequestId!: string;
}
