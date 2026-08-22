import { IsString, MinLength } from "class-validator";

export class ClassifyIssueDto {
  @IsString()
  @MinLength(3)
  description!: string;
}
