import { IsString, IsNumber, IsOptional, IsInt, Min, Max } from 'class-validator';

// This class defines exactly what the PUT /budgets endpoint accepts.
// Any field not listed here will be STRIPPED (whitelist: true).
// Any extra field the client sends will cause a 400 error (forbidNonWhitelisted).
export class UpsertBudgetDto {
  @IsString()               // must be a string
  categoryId: string;

  @IsNumber()               // must be a number
  @Min(1)                   // must be at least ₹1
  amount: number;

  @IsOptional()             // can be omitted — defaults to current month in the service
  @IsInt()                  // must be a whole number if provided
  @Min(1)
  @Max(12)
  month?: number;

  @IsOptional()
  @IsInt()
  @Min(2020)
  @Max(2100)
  year?: number;
}
