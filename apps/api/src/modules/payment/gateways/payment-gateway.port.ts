import type { Money } from "../../../common/money";

/**
 * Ch32: every third-party call goes through an internal adapter — no direct
 * SDK calls from domain code. PaymentService depends on this interface, not
 * on RazorpayGatewayAdapter directly (injected via the PAYMENT_GATEWAY
 * token, see payment.module.ts) — swapping gateways later, or mocking one in
 * a test, never touches PaymentService itself.
 */
export interface CreateOrderResult {
  orderId: string;
}

export interface PaymentGatewayPort {
  /** False when no API keys are configured — see RazorpayGatewayAdapter's constructor. */
  isConfigured(): boolean;
  createOrder(params: { amount: Money; currency: string; receipt: string }): Promise<CreateOrderResult>;
}

export const PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY");
