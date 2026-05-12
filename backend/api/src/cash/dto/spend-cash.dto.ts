import { IsNumber, IsPositive, IsIn, IsOptional, IsString, IsDateString, MaxLength } from 'class-validator';

export class SpendCashDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsIn(['SPENT', 'DEPOSITED'])
  source: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @IsDateString()
  date: string;
}
