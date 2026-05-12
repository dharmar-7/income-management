import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
} from '@nestjs/common';
import { BudgetsService } from './budgets.service';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { UpsertBudgetDto } from './dto/upsert-budget.dto';

function toInt(val: string | undefined, fallback: number): number {
  const n = parseInt(val ?? '', 10);
  return isNaN(n) ? fallback : n;
}

@Controller('budgets')
@UseGuards(ClerkAuthGuard)
export class BudgetsController {
  constructor(private service: BudgetsService) {}

  // GET /budgets?month=4&year=2026
  // Returns all budgets for the month with spent amount + % used
  @Get()
  getBudgets(
    @CurrentUser() userId: string,
    @Query('month') month?: string,
    @Query('year') year?: string,
  ) {
    return this.service.getBudgetsWithProgress(
      userId,
      month ? toInt(month, undefined!) : undefined,
      year ? toInt(year, undefined!) : undefined,
    );
  }

  // PUT /budgets
  // Body: { categoryId, amount, month?, year? }
  // Creates or updates — idempotent
  @Put()
  upsertBudget(
    @CurrentUser() userId: string,
    @Body() body: UpsertBudgetDto,
  ) {
    return this.service.upsertBudget(
      userId,
      body.categoryId,
      body.amount,
      body.month,
      body.year,
    );
  }

  // DELETE /budgets/:id
  @Delete(':id')
  deleteBudget(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.service.deleteBudget(userId, id);
  }
}
