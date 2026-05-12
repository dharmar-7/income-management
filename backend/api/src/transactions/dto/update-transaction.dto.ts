import { IsString, IsOptional, MaxLength } from 'class-validator';

// Defines what PATCH /transactions/:id accepts.
// Both fields are optional — the client may update category, note, or both.
export class UpdateTransactionDto {
  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)           // prevent absurdly long notes
  description?: string;
}
