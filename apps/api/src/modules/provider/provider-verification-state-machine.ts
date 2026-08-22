import { ConflictException } from "@nestjs/common";
import { ProviderVerificationStatus } from "@motiq/types";

/**
 * Ch98's two-tier (+ suspend/delist) verification state machine — never a
 * boolean (ADR 0005), and never a raw status write from anywhere else, the
 * same discipline as ADR 0004's ServiceRequest state machine.
 *
 * Reasoning behind the graph:
 * - UNVERIFIED can reach either PROVISIONAL (Ch7 §7.3.2's fast-track) or
 *   FULLY_VERIFIED directly (a provider whose full KYC clears immediately,
 *   skipping the provisional tier entirely — no reason to force a detour
 *   through it).
 * - PROVISIONAL -> FULLY_VERIFIED is the expected "reconciled shortly after"
 *   path Ch7 describes.
 * - SUSPENDED is reversible (a provider can be reinstated to either tier
 *   after review) — DELISTED is not; Ch98's "de-listing triggers" language
 *   treats delisting as the platform's terminal response, not a cooldown.
 * - Every path can reach DELISTED directly (a serious violation doesn't
 *   have to pass through SUSPENDED first).
 */
const ALLOWED_TRANSITIONS: Record<
  ProviderVerificationStatus,
  ReadonlySet<ProviderVerificationStatus>
> = {
  [ProviderVerificationStatus.UNVERIFIED]: new Set([
    ProviderVerificationStatus.PROVISIONAL,
    ProviderVerificationStatus.FULLY_VERIFIED,
    ProviderVerificationStatus.DELISTED,
  ]),
  [ProviderVerificationStatus.PROVISIONAL]: new Set([
    ProviderVerificationStatus.FULLY_VERIFIED,
    ProviderVerificationStatus.SUSPENDED,
    ProviderVerificationStatus.DELISTED,
  ]),
  [ProviderVerificationStatus.FULLY_VERIFIED]: new Set([
    ProviderVerificationStatus.SUSPENDED,
    ProviderVerificationStatus.DELISTED,
  ]),
  [ProviderVerificationStatus.SUSPENDED]: new Set([
    ProviderVerificationStatus.PROVISIONAL,
    ProviderVerificationStatus.FULLY_VERIFIED,
    ProviderVerificationStatus.DELISTED,
  ]),
  [ProviderVerificationStatus.DELISTED]: new Set([]),
};

export class InvalidVerificationTransitionException extends ConflictException {
  constructor(from: ProviderVerificationStatus, to: ProviderVerificationStatus) {
    super(`Cannot transition ProviderProfile verification status from ${from} to ${to}`);
  }
}

export function isTerminalVerificationStatus(status: ProviderVerificationStatus): boolean {
  return ALLOWED_TRANSITIONS[status].size === 0;
}

/** Statuses that count as "verified enough to work" — mirrors the WHERE
 * clauses in ProviderService's nearest-provider queries (Ch39/Ch53). */
export function isEligibleForMatching(status: ProviderVerificationStatus): boolean {
  return (
    status === ProviderVerificationStatus.PROVISIONAL ||
    status === ProviderVerificationStatus.FULLY_VERIFIED
  );
}

export function assertValidVerificationTransition(
  from: ProviderVerificationStatus,
  to: ProviderVerificationStatus,
): void {
  if (!ALLOWED_TRANSITIONS[from].has(to)) {
    throw new InvalidVerificationTransitionException(from, to);
  }
}
