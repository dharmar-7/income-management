import {
  IsString, IsNumber, IsEnum, IsOptional,
  IsDateString, IsInt, Min, Max,
} from 'class-validator';

export class CreateLoanDto {
  @IsString()
  name: string;

  @IsEnum(['HOME_LOAN','CAR_LOAN','PERSONAL_LOAN','EDUCATION_LOAN','TWO_WHEELER_LOAN','CREDIT_CARD_EMI','OTHER'])
  loanType: string;

  @IsString()
  lender: string;

  @IsNumber()
  @Min(1)
  principalAmount: number;

  @IsNumber()
  @Min(0)
  interestRate: number;

  @IsInt()
  @Min(1)
  tenure: number;

  @IsOptional()
  @IsNumber()
  @Min(1)
  emiAmount?: number;

  @IsInt()
  @Min(1)
  @Max(28)
  emiDay: number;

  @IsDateString()
  startDate: string;

  @IsOptional()
  @IsString()
  note?: string;
}
