import { IsString, MinLength } from "class-validator";

export class SendAssistantMessageDto {
  @IsString()
  @MinLength(1)
  message!: string;
}
