import { IsIn, IsInt, IsPositive, IsString } from 'class-validator';

const SUPPORTED_CURRENCIES = ['INR', 'USD'] as const;

export class CreatePaymentDto {
  @IsString()
  userId!: string;

  @IsInt()
  @IsPositive()
  amount!: number; // smallest currency unit, e.g. paise/cents

  @IsIn(SUPPORTED_CURRENCIES)
  currency!: (typeof SUPPORTED_CURRENCIES)[number];
}
