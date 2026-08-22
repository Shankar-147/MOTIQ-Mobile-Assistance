import { IsEnum, IsString, MinLength } from "class-validator";
import { DevicePlatform } from "@motiq/types";

export class RegisterDeviceTokenDto {
  @IsString()
  @MinLength(8)
  token!: string;

  @IsEnum(DevicePlatform)
  platform!: DevicePlatform;
}
