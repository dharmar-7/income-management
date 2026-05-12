import { IsString, IsNumber, IsOptional, IsPositive, MaxLength, Min } from 'class-validator';

export class CreatePlatformDto {
  @IsString()
  @MaxLength(100)
  name: string;

  @IsNumber()
  @Min(0)
  totalAdded: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
