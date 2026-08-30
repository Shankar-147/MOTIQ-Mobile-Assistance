import { createHmac, timingSafeEqual } from "crypto";

/**
 * Ch57: webhook signature verification is mandatory, never optional. Razorpay
 * signs the raw request body with HMAC-SHA256 using the webhook secret; this
 * must run against the untouched raw bytes, not a re-serialized JSON.parse'd
 * copy (whitespace/key-order differences would break the signature) — see
 * main.ts's `rawBody: true` and PaymentController's webhook route for how the
 * raw body actually reaches here.
 */
export function verifyRazorpaySignature(
  rawBody: string | Buffer,
  signature: string,
  secret: string,
): boolean {
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(signature, "utf8");
  // timingSafeEqual throws on length mismatch rather than returning false —
  // guard explicitly so a malformed header can't crash the request.
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, providedBuf);
}

/**
 * Razorpay's client-checkout verification formula — distinct from the
 * webhook's (signs `orderId|paymentId` with the API *key secret*, not a
 * separate webhook secret). This is the immediate-UX confirmation path a
 * customer's own checkout success callback drives; the webhook above remains
 * the authoritative reconciliation source of truth and is unchanged.
 */
export function verifyRazorpayPaymentSignature(
  orderId: string,
  paymentId: string,
  signature: string,
  keySecret: string,
): boolean {
  const expected = createHmac("sha256", keySecret).update(`${orderId}|${paymentId}`).digest("hex");
  const expectedBuf = Buffer.from(expected, "utf8");
  const providedBuf = Buffer.from(signature, "utf8");
  if (expectedBuf.length !== providedBuf.length) {
    return false;
  }
  return timingSafeEqual(expectedBuf, providedBuf);
}
