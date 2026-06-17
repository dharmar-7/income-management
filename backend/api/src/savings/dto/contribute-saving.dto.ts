import { IsNumber, IsOptional, IsPositive } from 'class-validator';

// Body for POST /savings/:id/contribute — adds one contribution to an investment.
// `amount` is optional: when omitted, the investment's stored monthly sipAmount is used.
export class ContributeSavingDto {
  @IsOptional()
  @IsNumber()
  @IsPositive()
  amount?: number;
}
