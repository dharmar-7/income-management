import {
  IsString, IsOptional, IsEnum, IsDateString,
  IsBoolean, IsInt, Min, Max, MaxLength,
} from 'class-validator';
import { EventType } from '@prisma/client';

export class UpdateEventDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  title?: string;

  @IsOptional()
  @IsEnum(EventType)
  type?: EventType;

  @IsOptional()
  @IsDateString()
  date?: string;

  @IsOptional()
  @IsBoolean()
  isSelf?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  personName?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(365)
  notifyDaysBefore?: number;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  note?: string;
}
