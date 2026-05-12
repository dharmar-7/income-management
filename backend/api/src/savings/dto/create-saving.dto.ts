import {
  IsString, IsNumber, IsEnum, IsOptional,
  IsDateString, IsPositive, MaxLength, Min,
} from 'class-validator';
import { SavingType } from '@prisma/client';

export class CreateSavingDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsEnum(SavingType)
  type: SavingType;

  @IsNumber()
  @IsPositive()
  investedAmount: number;

  @IsNumber()
  @Min(0)
  charges: number;

  @IsNumber()
  @Min(0)
  currentValue: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsDateString()
  maturityDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @IsOptional()
  @IsString()
  platformId?: string;
}
