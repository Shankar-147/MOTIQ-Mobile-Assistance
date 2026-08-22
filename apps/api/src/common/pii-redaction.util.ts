/**
 * Ch110's "PII scrubbing" requirement (ties to Ch126/Ch131) — a small, pure
 * utility for masking PII before it reaches a log line, since logs
 * frequently end up in less-access-controlled places (aggregators, error
 * trackers) than the primary database. Deliberately conservative pattern
 * matching (a phone-shaped or email-shaped substring), since a logging
 * utility that occasionally over-redacts a false positive is far safer than
 * one that misses a real phone number.
 */
const PHONE_PATTERN = /(\+?\d[\d\s-]{7,}\d)/g;
const EMAIL_PATTERN = /([a-zA-Z0-9._%+-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

export function redactPii(message: string): string {
  return message
    .replace(EMAIL_PATTERN, (_match, localPart: string) => `${localPart.slice(0, 2)}***@***redacted***`)
    .replace(PHONE_PATTERN, (match) => `${match.slice(0, 3)}***${match.slice(-2)}`);
}
