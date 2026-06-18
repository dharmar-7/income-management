import {
  IsString, IsNumber, IsOptional, IsPositive,
  IsDateString, MaxLength, Min,
} from 'class-validator';

// Every field optional — PATCH only what changed.
export class UpdateGoalDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(8)
  icon?: string;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  targetAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  savedAmount?: number;

  // null clears the target date.
  @IsOptional()
  @IsDateString()
  targetDate?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
