import { IsNumber } from 'class-validator';

// Body for POST /goals/:id/contribute. A positive amount adds money toward the
// goal; a negative amount withdraws. savedAmount is floored at 0.
export class ContributeGoalDto {
  @IsNumber()
  amount: number;
}
