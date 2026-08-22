import { IsString, MinLength } from "class-validator";

export class AdminLoginDto {
  @IsString()
  identifier!: string; // phone or email

  @IsString()
  @MinLength(8)
  password!: string;
}
