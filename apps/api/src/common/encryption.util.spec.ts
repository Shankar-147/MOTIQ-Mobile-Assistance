import { decryptField, encryptField, EncryptionKeyNotConfiguredError } from "./encryption.util";

const TEST_KEY = "0".repeat(64); // 32 bytes hex, test-only.

describe("encryptField / decryptField", () => {
  it("round-trips a value", () => {
    const ciphertext = encryptField("https://example.com/license.pdf", TEST_KEY);
    expect(decryptField(ciphertext, TEST_KEY)).toBe("https://example.com/license.pdf");
  });

  it("produces different ciphertext for the same plaintext each time (random IV)", () => {
    const first = encryptField("same value", TEST_KEY);
    const second = encryptField("same value", TEST_KEY);
    expect(first).not.toBe(second);
    expect(decryptField(first, TEST_KEY)).toBe("same value");
    expect(decryptField(second, TEST_KEY)).toBe("same value");
  });

  it("throws EncryptionKeyNotConfiguredError instead of silently storing plaintext", () => {
    expect(() => encryptField("secret", undefined)).toThrow(EncryptionKeyNotConfiguredError);
  });

  it("rejects a key that isn't 32 bytes", () => {
    expect(() => encryptField("secret", "abcd")).toThrow(/32-byte/);
  });

  it("detects tampering via the auth tag", () => {
    const ciphertext = encryptField("original", TEST_KEY);
    const [iv, authTag, encrypted] = ciphertext.split(":");
    const tampered = [iv, authTag, encrypted.slice(0, -2) + "ff"].join(":");
    expect(() => decryptField(tampered, TEST_KEY)).toThrow();
  });

  it("rejects malformed ciphertext", () => {
    expect(() => decryptField("not-valid-ciphertext", TEST_KEY)).toThrow(/Malformed ciphertext/);
  });
});
