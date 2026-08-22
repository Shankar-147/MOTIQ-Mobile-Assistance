import { IsString, Length } from "class-validator";

export class ConfirmMfaEnrollmentDto {
  @IsString()
  @Length(6, 6)
  code!: string;
}
