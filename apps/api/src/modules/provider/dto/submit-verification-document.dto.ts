import { IsEnum, IsUrl } from "class-validator";
import { VerificationDocumentType } from "@motiq/types";

export class SubmitVerificationDocumentDto {
  @IsEnum(VerificationDocumentType)
  documentType!: VerificationDocumentType;

  // No real file storage integration exists yet (Ch94 is future work) — this
  // is a client-supplied reference (e.g. a pre-signed upload URL), not a
  // verified upload. See docs/decisions/0016-*.md.
  @IsUrl()
  fileUrl!: string;
}
