import { generateOtpCode, hashOtpCode, verifyOtpCode } from "./otp.util";

describe("OTP utilities (Ch50)", () => {
  it("generates a 6-digit numeric code every time", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateOtpCode();
      expect(code).toMatch(/^\d{6}$/);
    }
  });

  it("verifies a code against its own hash", () => {
    const code = generateOtpCode();
    expect(verifyOtpCode(code, hashOtpCode(code))).toBe(true);
  });

  it("rejects a wrong code", () => {
    expect(verifyOtpCode("111111", hashOtpCode("222222"))).toBe(false);
  });

  it("never stores the code in plain form (hash differs from the code)", () => {
    const code = "123456";
    expect(hashOtpCode(code)).not.toBe(code);
  });
});
