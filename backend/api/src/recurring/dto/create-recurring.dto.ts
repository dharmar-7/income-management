import {
  IsString, IsNumber, IsEnum, IsOptional,
  IsDateString, IsInt, Min, Max,
} from 'class-validator';

export class CreateRecurringDto {
  @IsString()
  name: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(['DEBIT', 'CREDIT'])
  type: 'DEBIT' | 'CREDIT';

  @IsEnum(['WEEKLY', 'MONTHLY', 'YEARLY'])
  frequency: 'WEEKLY' | 'MONTHLY' | 'YEARLY';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  dayOfMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek?: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsString()
  categoryId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}
