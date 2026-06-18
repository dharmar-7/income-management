import {
  IsString, IsNumber, IsOptional, IsPositive,
  IsDateString, MaxLength, Min,
} from 'class-validator';

export class CreateGoalDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsString()
  @MaxLength(8) // a single emoji
  icon?: string;

  @IsNumber()
  @IsPositive()
  targetAmount: number;

  // Optional starting progress (defaults to 0).
  @IsOptional()
  @IsNumber()
  @Min(0)
  savedAmount?: number;

  @IsOptional()
  @IsDateString()
  targetDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
