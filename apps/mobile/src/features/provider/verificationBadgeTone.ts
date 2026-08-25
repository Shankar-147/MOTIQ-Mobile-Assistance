import { ProviderVerificationStatus, VerificationDocumentStatus } from "@motiq/types";
import { BadgeTone } from "../../components/ui";

const VERIFICATION_TONE_MAP: Record<ProviderVerificationStatus, BadgeTone> = {
  [ProviderVerificationStatus.UNVERIFIED]: "neutral",
  [ProviderVerificationStatus.PROVISIONAL]: "info",
  [ProviderVerificationStatus.FULLY_VERIFIED]: "success",
  [ProviderVerificationStatus.SUSPENDED]: "warning",
  [ProviderVerificationStatus.DELISTED]: "danger",
};

/** Shared status→tone mapping so Home/Profile render the same tier colors
 * instead of independently-invented palettes. */
export function verificationBadgeTone(status: ProviderVerificationStatus): BadgeTone {
  return VERIFICATION_TONE_MAP[status];
}

const DOCUMENT_TONE_MAP: Record<VerificationDocumentStatus, BadgeTone> = {
  [VerificationDocumentStatus.PENDING]: "warning",
  [VerificationDocumentStatus.APPROVED]: "success",
  [VerificationDocumentStatus.REJECTED]: "danger",
};

export function documentBadgeTone(status: VerificationDocumentStatus): BadgeTone {
  return DOCUMENT_TONE_MAP[status];
}
