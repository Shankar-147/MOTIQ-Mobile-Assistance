import { IsIn } from "class-validator";

export class DemoLoginDto {
  @IsIn(["CUSTOMER", "PROVIDER"])
  role!: "CUSTOMER" | "PROVIDER";
}
