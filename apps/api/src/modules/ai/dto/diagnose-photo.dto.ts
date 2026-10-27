import { IsIn, IsOptional, IsString, MaxLength } from "class-validator";

export class DiagnosePhotoDto {
  /** Base64 (no "data:" prefix) of a JPEG/PNG/WebP — the app downsizes before sending, ~3 MB max. */
  @IsString()
  @MaxLength(4_000_000)
  imageBase64!: string;

  @IsIn(["image/jpeg", "image/png", "image/webp"])
  mimeType!: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
