import { IsIn } from 'class-validator';

const USER_STATUSES = ['active', 'suspended'] as const;

export class UpdateUserStatusDto {
  @IsIn(USER_STATUSES)
  status!: (typeof USER_STATUSES)[number];
}
