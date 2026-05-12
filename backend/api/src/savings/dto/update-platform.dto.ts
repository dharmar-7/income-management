import { IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class UpdatePlatformDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  totalAdded?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
