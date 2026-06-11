import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class BudgetsService {
  constructor(private prisma: PrismaService) {}

  private resolveUserId(clerkId: string): Promise<string> {
    return this.prisma.resolveUserId(clerkId);
  }

  // List all budgets for a given month, enriched with how much was actually spent
  async getBudgetsWithProgress(clerkId: string, month?: number, year?: number) {
    const userId = await this.resolveUserId(clerkId);
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();

    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0, 23, 59, 59);

    // Fetch budgets for this month
    const budgets = await this.prisma.budget.findMany({
      where: { userId, month: m, year: y },
      include: { category: true },
      orderBy: { category: { name: 'asc' } },
    });

    // Spend-per-category for this month in ONE grouped query (replaces the old
    // N+1 — one aggregate per budget). Budgets are unique per category per month,
    // so categoryId is a safe lookup key.
    const spentRows = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: TransactionType.DEBIT,
        date: { gte: startOfMonth, lte: endOfMonth },
        categoryId: { in: budgets.map(b => b.categoryId) },
      },
      _sum: { amount: true },
    });
    const spentByCategory = new Map(
      spentRows.map(r => [r.categoryId, r._sum.amount ?? 0]),
    );

    const results = budgets.map((budget) => {
      const spent = spentByCategory.get(budget.categoryId) ?? 0;
      return {
        id: budget.id,
        amount: budget.amount,
        month: budget.month,
        year: budget.year,
        category: budget.category,
        spent,
        remaining: budget.amount - spent,
        percentUsed: budget.amount > 0 ? Math.min((spent / budget.amount) * 100, 100) : 0,
      };
    });

    return { data: results, month: m, year: y };
  }

  // Create a new budget or update an existing one for the same category+month+year
  async upsertBudget(
    clerkId: string,
    categoryId: string,
    amount: number,
    month?: number,
    year?: number,
  ) {
    const userId = await this.resolveUserId(clerkId);
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();

    return this.prisma.budget.upsert({
      where: { userId_categoryId_month_year: { userId, categoryId, month: m, year: y } },
      update: { amount },
      create: { userId, categoryId, amount, month: m, year: y },
      include: { category: true },
    });
  }

  // Delete a budget — verifies ownership first
  async deleteBudget(clerkId: string, budgetId: string) {
    const userId = await this.resolveUserId(clerkId);
    const budget = await this.prisma.budget.findUnique({ where: { id: budgetId } });
    if (!budget) throw new NotFoundException('Budget not found.');
    if (budget.userId !== userId) throw new ForbiddenException('Not your budget.');
    await this.prisma.budget.delete({ where: { id: budgetId } });
    return { deleted: true };
  }
}
