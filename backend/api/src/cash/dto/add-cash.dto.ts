import { IsNumber, IsPositive, IsIn, IsOptional, IsString, IsDateString, MaxLength } from 'class-validator';

export class AddCashDto {
  @IsNumber()
  @IsPositive()
  amount: number;

  @IsIn(['ATM', 'PERSON', 'OTHER'])
  source: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;

  @IsDateString()
  date: string;
}
