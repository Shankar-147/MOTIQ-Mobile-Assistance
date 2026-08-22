import { generateOpaqueToken, hashToken } from "./token.util";

describe("refresh token utilities (ADR 0011)", () => {
  it("generates a high-entropy, unique token each call", () => {
    const tokens = new Set(Array.from({ length: 20 }, () => generateOpaqueToken()));
    expect(tokens.size).toBe(20);
    for (const token of tokens) {
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    }
  });

  it("hashes deterministically so a stored hash can be matched on refresh", () => {
    const token = generateOpaqueToken();
    expect(hashToken(token)).toBe(hashToken(token));
  });

  it("never stores the raw token (hash differs from the token)", () => {
    const token = generateOpaqueToken();
    expect(hashToken(token)).not.toBe(token);
  });
});
