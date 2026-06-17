import {
  IsNumber, IsOptional, IsString, IsEnum,
  IsDateString, IsPositive, MaxLength, Min,
} from 'class-validator';
import { SavingType } from '@prisma/client';

// Every field optional — the client PATCHes only what changed. Investments are
// fully editable (fix a wrong name/amount, update the market value, set up or
// change a monthly SIP, move platforms, etc.).
export class UpdateSavingDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  name?: string;

  @IsOptional()
  @IsEnum(SavingType)
  type?: SavingType;

  @IsOptional()
  @IsNumber()
  @IsPositive()
  investedAmount?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  charges?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  currentValue?: number;

  // Monthly SIP amount. 0 disables the quick "+1 month" button.
  @IsOptional()
  @IsNumber()
  @Min(0)
  sipAmount?: number;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  // null clears the maturity date.
  @IsOptional()
  @IsDateString()
  maturityDate?: string | null;

  // null detaches the investment from any platform (makes it standalone).
  @IsOptional()
  @IsString()
  platformId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
