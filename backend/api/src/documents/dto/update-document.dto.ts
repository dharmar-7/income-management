import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

// Metadata-only edits (the file bytes themselves aren't changed here).
export class UpdateDocumentDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  // null clears the expiry date.
  @IsOptional()
  @IsDateString()
  expiresAt?: string | null;
}
