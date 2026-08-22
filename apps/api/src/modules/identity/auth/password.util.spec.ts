import { comparePassword, hashPassword } from "./password.util";

describe("password utilities (Ch33, Ch93)", () => {
  it("verifies a password against its own hash", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(comparePassword("correct horse battery staple", hash)).resolves.toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("correct horse battery staple");
    await expect(comparePassword("wrong password", hash)).resolves.toBe(false);
  });

  it("never stores the password in plain form (hash differs from the password)", async () => {
    const hash = await hashPassword("correct horse battery staple");
    expect(hash).not.toBe("correct horse battery staple");
  });
});
