import { authenticator } from "otplib";
import { generateTotpSecret, generateTotpUri, verifyTotpCode } from "./totp.util";

describe("totp.util", () => {
  it("generates a secret and accepts the code it currently produces", () => {
    const secret = generateTotpSecret();
    const code = authenticator.generate(secret);
    expect(verifyTotpCode(code, secret)).toBe(true);
  });

  it("rejects an incorrect code", () => {
    const secret = generateTotpSecret();
    expect(verifyTotpCode("000000", secret)).toBe(false);
  });

  it("rejects a malformed code without throwing", () => {
    const secret = generateTotpSecret();
    expect(verifyTotpCode("not-a-code", secret)).toBe(false);
  });

  it("builds an otpauth:// URI naming MOTIQ as the issuer", () => {
    const uri = generateTotpUri("JBSWY3DPEHPK3PXP", "admin@motiq.dev");
    expect(uri).toContain("otpauth://totp/");
    expect(uri).toContain("MOTIQ");
    expect(uri).toContain("admin%40motiq.dev");
  });
});
