import { createHmac } from "crypto";
import { verifyRazorpayPaymentSignature, verifyRazorpaySignature } from "./razorpay-signature.util";

const secret = "whsec_test_secret";
const rawBody = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_123" } } } });

function sign(body: string, withSecret: string): string {
  return createHmac("sha256", withSecret).update(body).digest("hex");
}

describe("verifyRazorpaySignature (Ch57, binding)", () => {
  it("accepts a correctly signed body", () => {
    expect(verifyRazorpaySignature(rawBody, sign(rawBody, secret), secret)).toBe(true);
  });

  it("rejects a signature computed with the wrong secret", () => {
    expect(verifyRazorpaySignature(rawBody, sign(rawBody, "wrong_secret"), secret)).toBe(false);
  });

  it("rejects a signature for a different (tampered) body", () => {
    const tamperedBody = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_999" } } } });
    expect(verifyRazorpaySignature(tamperedBody, sign(rawBody, secret), secret)).toBe(false);
  });

  it("rejects a garbage signature without throwing", () => {
    expect(verifyRazorpaySignature(rawBody, "not-a-real-signature", secret)).toBe(false);
  });

  it("works against a Buffer body, not just a string", () => {
    const buf = Buffer.from(rawBody, "utf8");
    expect(verifyRazorpaySignature(buf, sign(rawBody, secret), secret)).toBe(true);
  });
});

describe("verifyRazorpayPaymentSignature (client-checkout confirmation)", () => {
  const keySecret = "rzp_test_key_secret";
  const orderId = "order_ABC123";
  const paymentId = "pay_XYZ789";

  function signPayment(order: string, payment: string, withSecret: string): string {
    return createHmac("sha256", withSecret).update(`${order}|${payment}`).digest("hex");
  }

  it("accepts a correctly signed order/payment pair", () => {
    const signature = signPayment(orderId, paymentId, keySecret);
    expect(verifyRazorpayPaymentSignature(orderId, paymentId, signature, keySecret)).toBe(true);
  });

  it("rejects a signature computed with the wrong key secret", () => {
    const signature = signPayment(orderId, paymentId, "wrong_secret");
    expect(verifyRazorpayPaymentSignature(orderId, paymentId, signature, keySecret)).toBe(false);
  });

  it("rejects a signature for a different (tampered) payment id", () => {
    const signature = signPayment(orderId, paymentId, keySecret);
    expect(verifyRazorpayPaymentSignature(orderId, "pay_TAMPERED", signature, keySecret)).toBe(false);
  });

  it("rejects a garbage signature without throwing", () => {
    expect(verifyRazorpayPaymentSignature(orderId, paymentId, "not-a-real-signature", keySecret)).toBe(false);
  });
});
