import { redactPii } from "./pii-redaction.util";

describe("redactPii", () => {
  it("redacts an email address", () => {
    const result = redactPii("OTP sent to jane.doe@example.com");
    expect(result).not.toContain("jane.doe@example.com");
    expect(result).toContain("***redacted***");
  });

  it("redacts a phone number", () => {
    const result = redactPii("OTP for +919876543210: 123456");
    expect(result).not.toContain("+919876543210");
  });

  it("leaves non-PII text untouched", () => {
    expect(redactPii("Payment settled for request abc-123")).toBe(
      "Payment settled for request abc-123",
    );
  });

  it("redacts multiple PII values in the same message", () => {
    const result = redactPii("Contact +919876543210 or jane@example.com");
    expect(result).not.toContain("+919876543210");
    expect(result).not.toContain("jane@example.com");
  });
});
