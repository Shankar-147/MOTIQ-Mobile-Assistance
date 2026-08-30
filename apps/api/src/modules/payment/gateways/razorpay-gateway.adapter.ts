import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Prisma } from "@prisma/client";
import Razorpay from "razorpay";
import type { Money } from "../../../common/money";
import { CreateOrderResult, PaymentGatewayPort } from "./payment-gateway.port";
import { verifyRazorpayPaymentSignature } from "./razorpay-signature.util";

/**
 * Ch57's Razorpay integration, behind PaymentGatewayPort (Ch32). No API keys
 * are configured in this bootstrap phase (RAZORPAY_KEY_ID/SECRET are blank in
 * .env.example) — the adapter degrades to isConfigured() === false rather
 * than throwing at startup, so the rest of the app (and its tests) work with
 * no gateway wired, matching the pattern already established for
 * NotificationService and AuthService's OTP delivery.
 */
@Injectable()
export class RazorpayGatewayAdapter implements PaymentGatewayPort {
  private readonly logger = new Logger(RazorpayGatewayAdapter.name);
  private readonly client: Razorpay | null;
  private readonly keyId: string | null;
  private readonly keySecret: string | null;

  constructor(config: ConfigService) {
    const keyId = config.get<string>("RAZORPAY_KEY_ID");
    const keySecret = config.get<string>("RAZORPAY_KEY_SECRET");
    this.keyId = keyId ?? null;
    this.keySecret = keySecret ?? null;
    this.client = keyId && keySecret ? new Razorpay({ key_id: keyId, key_secret: keySecret }) : null;

    if (!this.client) {
      this.logger.warn(
        "RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET not set — payment gateway calls will be skipped (Ch32). " +
          "Payments settle as PENDING with no gatewayReference until this is configured.",
      );
    }
  }

  isConfigured(): boolean {
    return this.client !== null;
  }

  getPublicKeyId(): string | null {
    return this.keyId;
  }

  verifyClientPaymentSignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!this.keySecret) {
      return false;
    }
    return verifyRazorpayPaymentSignature(orderId, paymentId, signature, this.keySecret);
  }

  async createOrder(params: {
    amount: Money;
    currency: string;
    receipt: string;
  }): Promise<CreateOrderResult> {
    if (!this.client) {
      throw new Error("RazorpayGatewayAdapter is not configured — check isConfigured() first.");
    }
    // Razorpay amounts are in the smallest currency unit (paise for INR).
    const amountInPaise = params.amount
      .mul(100)
      .toDecimalPlaces(0, Prisma.Decimal.ROUND_HALF_UP)
      .toNumber();

    const order = await this.client.orders.create({
      amount: amountInPaise,
      currency: params.currency,
      receipt: params.receipt,
    });
    return { orderId: order.id };
  }
}
