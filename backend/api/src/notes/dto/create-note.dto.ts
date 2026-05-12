import {
  IsString, IsOptional, IsBoolean, IsArray,
  IsDateString, MaxLength, IsIn,
} from 'class-validator';

const VALID_COLORS = ['white', 'yellow', 'teal', 'pink', 'blue', 'purple', 'orange', 'green', 'mirror'];

export class CreateNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(300)
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsIn(VALID_COLORS)
  color?: string;

  @IsOptional()
  @IsBoolean()
  isPinned?: boolean;

  @IsOptional()
  @IsBoolean()
  isArchived?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];

  @IsOptional()
  @IsDateString()
  reminderAt?: string;
}
