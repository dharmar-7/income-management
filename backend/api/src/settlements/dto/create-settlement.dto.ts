import {
  IsString, IsNumber, IsEnum, IsOptional,
  IsDateString, Min,
} from 'class-validator';

export class CreateSettlementDto {
  @IsString()
  personName: string;

  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsEnum(['SENT', 'RECEIVED'])
  direction: 'SENT' | 'RECEIVED';

  @IsDateString()
  transferredAt: string;

  @IsOptional()
  @IsString()
  originalTxId?: string;

  @IsOptional()
  @IsString()
  note?: string;
}

export class SettleDto {
  @IsOptional()
  @IsString()
  repaymentTxId?: string;

  @IsOptional()
  @IsDateString()
  settledAt?: string;
}
