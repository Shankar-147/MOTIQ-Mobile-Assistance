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

export interface RefundResult {
  refundId: string;
}

export interface PaymentGatewayPort {
  /** False when no API keys are configured — see RazorpayGatewayAdapter's constructor. */
  isConfigured(): boolean;
  createOrder(params: { amount: Money; currency: string; receipt: string }): Promise<CreateOrderResult>;
  /** The gateway's public key/identifier a mobile client's checkout SDK needs
   * to open a checkout session — safe to expose to a client, unlike the
   * matching secret. Null when not configured. */
  getPublicKeyId(): string | null;
  /** Verifies a client checkout's own success-callback signature (distinct
   * from the webhook's signature scheme) — see
   * razorpay-signature.util.ts's verifyRazorpayPaymentSignature doc comment. */
  verifyClientPaymentSignature(orderId: string, paymentId: string, signature: string): boolean;
  /** Full refund of a captured payment, keyed by the gateway's own payment id
   * (not the order id — Razorpay's refund API operates on payments). */
  refundPayment(params: { gatewayPaymentId: string; amount: Money }): Promise<RefundResult>;
}

export const PAYMENT_GATEWAY = Symbol("PAYMENT_GATEWAY");
