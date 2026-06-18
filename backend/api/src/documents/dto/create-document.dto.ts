import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  category?: string;

  // Raw file bytes, base64-encoded (image or PDF). Decoded + size-checked server-side.
  @IsString()
  dataBase64: string;

  @IsString()
  @MaxLength(100)
  mimeType: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
