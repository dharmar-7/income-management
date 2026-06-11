import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  private resolveUserId(clerkId: string): Promise<string> {
    return this.prisma.resolveUserId(clerkId);
  }

  // ─── Monthly Report ──────────────────────────────────────────────────────────
  // Returns a rich breakdown for a single month: summary, top categories, top merchants
  async getMonthlyReport(clerkId: string, month?: number, year?: number) {
    const userId = await this.resolveUserId(clerkId);
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();

    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    // Run all queries in parallel for speed
    const [income, expenses, txCount, categoryGroups, merchantGroups] = await Promise.all([
      // Total income
      this.prisma.transaction.aggregate({
        where: { userId, type: TransactionType.CREDIT, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      // Total expenses
      this.prisma.transaction.aggregate({
        where: { userId, type: TransactionType.DEBIT, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
      // Total transaction count
      this.prisma.transaction.count({
        where: { userId, date: { gte: start, lte: end } },
      }),
      // Group expenses by category
      this.prisma.transaction.groupBy({
        by: ['categoryId'],
        where: {
          userId,
          type: TransactionType.DEBIT,
          date: { gte: start, lte: end },
          categoryId: { not: null },
        },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
      // Group expenses by merchant
      this.prisma.transaction.groupBy({
        by: ['merchant'],
        where: { userId, type: TransactionType.DEBIT, date: { gte: start, lte: end } },
        _sum: { amount: true },
        _count: true,
        orderBy: { _sum: { amount: 'desc' } },
        take: 5,
      }),
    ]);

    // Enrich category groups with category details
    const categoryIds = categoryGroups.map(g => g.categoryId!).filter(Boolean);
    const categories = await this.prisma.category.findMany({
      where: { id: { in: categoryIds } },
    });
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    const totalIncome = income._sum.amount ?? 0;
    const totalExpenses = expenses._sum.amount ?? 0;

    return {
      month: m,
      year: y,
      summary: {
        totalIncome,
        totalExpenses,
        netSavings: totalIncome - totalExpenses,
        transactionCount: txCount,
      },
      topCategories: categoryGroups.map(g => ({
        category: categoryMap.get(g.categoryId!) ?? { name: 'Other', icon: '📦' },
        total: g._sum.amount ?? 0,
        count: g._count,
      })),
      topMerchants: merchantGroups.map(g => ({
        merchant: g.merchant,
        total: g._sum.amount ?? 0,
        count: g._count,
      })),
    };
  }

  // ─── Annual Report ───────────────────────────────────────────────────────────
  // Single raw SQL query instead of 24 separate aggregate calls (12 months × 2 types).
  async getAnnualReport(clerkId: string, year?: number) {
    const userId = await this.resolveUserId(clerkId);
    const y = year ?? new Date().getFullYear();
    const startOfYear = new Date(y, 0, 1);
    const endOfYear = new Date(y, 11, 31, 23, 59, 59);

    const rows = await this.prisma.$queryRaw<
      { mo: number; type: string; total: number }[]
    >`
      SELECT
        EXTRACT(MONTH FROM date)::int AS mo,
        type,
        COALESCE(SUM(amount), 0)      AS total
      FROM "Transaction"
      WHERE "userId" = ${userId}
        AND date >= ${startOfYear}
        AND date <= ${endOfYear}
      GROUP BY mo, type
      ORDER BY mo
    `;

    const months = Array.from({ length: 12 }, (_, i) => {
      const m = i + 1;
      const inc = Number(rows.find(r => r.mo === m && r.type === 'CREDIT')?.total ?? 0);
      const exp = Number(rows.find(r => r.mo === m && r.type === 'DEBIT')?.total ?? 0);
      return { month: m, income: inc, expenses: exp, savings: inc - exp };
    });

    const totals = months.reduce(
      (acc, m) => ({
        income: acc.income + m.income,
        expenses: acc.expenses + m.expenses,
        savings: acc.savings + m.savings,
      }),
      { income: 0, expenses: 0, savings: 0 },
    );

    return { year: y, months, totals };
  }

  // ─── CSV Export ──────────────────────────────────────────────────────────────
  // Returns a CSV string of all transactions in a given month (or all time)
  async generateCsv(clerkId: string, month?: number, year?: number): Promise<string> {
    const userId = await this.resolveUserId(clerkId);

    // Build date filter only if month/year are provided
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();
    const start = new Date(y, m - 1, 1);
    const end = new Date(y, m, 0, 23, 59, 59);

    const transactions = await this.prisma.transaction.findMany({
      where: {
        userId,
        ...(month || year ? { date: { gte: start, lte: end } } : {}),
      },
      include: { category: true },
      orderBy: { date: 'desc' },
    });

    // Build CSV — escape commas and quotes in text fields
    const escape = (val: string | null | undefined) => {
      if (!val) return '';
      const str = String(val);
      // Wrap in quotes if the value contains a comma, quote, or newline
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const header = 'Date,Merchant,Type,Category,Amount,Description';

    const rows = transactions.map(tx =>
      [
        tx.date.toISOString().split('T')[0],   // YYYY-MM-DD
        escape(tx.merchant),
        tx.type,
        escape(tx.category?.name ?? 'Uncategorized'),
        tx.amount.toFixed(2),
        escape(tx.description),
      ].join(','),
    );

    return [header, ...rows].join('\n');
  }
}
