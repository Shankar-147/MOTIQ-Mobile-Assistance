import { IsOptional, IsString, IsUUID, MaxLength, MinLength } from "class-validator";

export class SendAgentMessageDto {
  /** Omit to start a new conversation. */
  @IsOptional()
  @IsUUID()
  conversationId?: string;

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;
}
