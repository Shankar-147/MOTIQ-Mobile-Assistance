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
