import { IsOptional, IsString, MaxLength } from "class-validator";

/** Ch61's admin manual refund — see PaymentService.refundPayment(). */
export class RefundPaymentDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
