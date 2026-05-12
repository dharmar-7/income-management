import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdateSavingDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  currentValue?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  charges?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
