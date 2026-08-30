import { IsString, MinLength } from "class-validator";

/** The three values Razorpay's checkout SDK returns to the client on a
 * successful charge — see PaymentService.confirmClientPayment()'s doc comment. */
export class ConfirmPaymentDto {
  @IsString()
  @MinLength(1)
  razorpayOrderId!: string;

  @IsString()
  @MinLength(1)
  razorpayPaymentId!: string;

  @IsString()
  @MinLength(1)
  razorpaySignature!: string;
}
