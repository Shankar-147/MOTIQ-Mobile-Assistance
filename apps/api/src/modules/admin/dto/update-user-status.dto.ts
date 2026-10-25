import { IsBoolean } from "class-validator";

/** Admin-only account suspend/reactivate — see IdentityService.updateUserStatus(). */
export class UpdateUserStatusDto {
  @IsBoolean()
  isActive!: boolean;
}
