import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

/**
 * Ch94's field-level PII encryption, closing the named V0 gap ("AES-256
 * stated with no key-management design"). AES-256-GCM with a random 12-byte
 * IV per value (never reused) and the GCM auth tag stored alongside the
 * ciphertext, so tampering is detectable, not just undecryptable-by-accident.
 *
 * The key comes from ENCRYPTION_MASTER_KEY (a 32-byte hex string) — there is
 * no real KMS in this bootstrap environment (Ch94 ultimately wants a real
 * KMS-managed key, not a bare env var), so this is the same honest-gap
 * pattern as everywhere else: `encrypt()`/`decrypt()` throw clearly if the
 * key isn't configured, rather than silently falling back to storing
 * plaintext and pretending it's encrypted. See ADR 0020.
 */
const IV_LENGTH_BYTES = 12;
const AUTH_TAG_LENGTH_BYTES = 16;
const ALGORITHM = "aes-256-gcm";

export class EncryptionKeyNotConfiguredError extends Error {
  constructor() {
    super(
      "ENCRYPTION_MASTER_KEY is not configured — refusing to silently store this value as plaintext. " +
        "Set a 32-byte hex key (see .env.example) before writing to an encrypted field.",
    );
  }
}

function resolveKey(masterKeyHex: string | undefined): Buffer {
  if (!masterKeyHex) {
    throw new EncryptionKeyNotConfiguredError();
  }
  const key = Buffer.from(masterKeyHex, "hex");
  if (key.length !== 32) {
    throw new Error("ENCRYPTION_MASTER_KEY must be a 32-byte value, hex-encoded (64 hex characters).");
  }
  return key;
}

/** Ciphertext is returned as `${iv}:${authTag}:${encrypted}`, each hex-encoded. */
export function encryptField(plaintext: string, masterKeyHex: string | undefined): string {
  const key = resolveKey(masterKeyHex);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return [iv.toString("hex"), authTag.toString("hex"), encrypted.toString("hex")].join(":");
}

export function decryptField(ciphertext: string, masterKeyHex: string | undefined): string {
  const key = resolveKey(masterKeyHex);
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(":");
  if (!ivHex || !authTagHex || !encryptedHex) {
    throw new Error("Malformed ciphertext — expected '<iv>:<authTag>:<encrypted>', all hex-encoded.");
  }
  const authTag = Buffer.from(authTagHex, "hex");
  if (authTag.length !== AUTH_TAG_LENGTH_BYTES) {
    throw new Error("Malformed ciphertext — auth tag has an unexpected length.");
  }
  const decipher = createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, "hex")), decipher.final()]);
  return decrypted.toString("utf8");
}
