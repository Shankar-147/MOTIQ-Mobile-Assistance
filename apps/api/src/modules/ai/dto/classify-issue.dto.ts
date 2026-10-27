import { IsString, MaxLength, MinLength } from "class-validator";

export class ClassifyIssueDto {
  @IsString()
  @MinLength(3)
  @MaxLength(1000)
  description!: string;
}
