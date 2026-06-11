import { Injectable, NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType, ImportSource } from '@prisma/client';
import { CreateTransactionDto } from './dto/create-transaction.dto';

export interface TransactionFilters {
  page: number;
  limit: number;
  search?: string;
  categoryId?: string;
  type?: TransactionType;
  dateFrom?: Date;
  dateTo?: Date;
  sortBy: 'date' | 'amount';
  sortOrder: 'asc' | 'desc';
}

@Injectable()
export class TransactionsService {
  constructor(private prisma: PrismaService) {}

  // Resolve internal DB userId from Clerk ID (cached in PrismaService)
  private resolveUserId(clerkId: string): Promise<string> {
    return this.prisma.resolveUserId(clerkId);
  }

  // Paginated + filtered transaction list
  async findAll(clerkId: string, filters: TransactionFilters) {
    const userId = await this.resolveUserId(clerkId);
    const {
      page, limit, search, categoryId,
      type, dateFrom, dateTo, sortBy, sortOrder,
    } = filters;

    const where = {
      userId,
      ...(search && {
        merchant: { contains: search, mode: 'insensitive' as const },
      }),
      ...(categoryId && { categoryId }),
      ...(type && { type }),
      ...((dateFrom || dateTo) && {
        date: {
          ...(dateFrom && { gte: dateFrom }),
          ...(dateTo && { lte: dateTo }),
        },
      }),
    };

    const [transactions, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        include: { category: true },
        orderBy: { [sortBy]: sortOrder },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data: transactions,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Summary — total income, expenses, net savings for the current month (or all time)
  async getSummary(clerkId: string, month?: number, year?: number) {
    const userId = await this.resolveUserId(clerkId);
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();

    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0, 23, 59, 59);

    // One grouped query instead of four separate aggregates — Postgres sums
    // every type in a single round-trip.
    const grouped = await this.prisma.transaction.groupBy({
      by: ['type'],
      where: { userId, date: { gte: startOfMonth, lte: endOfMonth } },
      _sum: { amount: true },
    });
    const sumByType = (t: TransactionType) =>
      grouped.find(g => g.type === t)?._sum.amount ?? 0;

    const totalIncome = sumByType(TransactionType.CREDIT);
    const totalExpenses = sumByType(TransactionType.DEBIT);
    const totalRefunds = sumByType(TransactionType.REFUND);
    const totalInvestments = sumByType(TransactionType.INVESTMENT);
    // Refunds reduce expenses; INVESTMENT transfers are excluded entirely
    const netExpenses = totalExpenses - totalRefunds;

    return {
      month: m,
      year: y,
      totalIncome,
      totalExpenses: netExpenses,
      totalRefunds,
      totalInvestments,
      netSavings: totalIncome - netExpenses,
    };
  }

  // Spending breakdown by category
  async getByCategory(clerkId: string, month?: number, year?: number) {
    const userId = await this.resolveUserId(clerkId);
    const now = new Date();
    const m = month ?? now.getMonth() + 1;
    const y = year ?? now.getFullYear();

    const startOfMonth = new Date(y, m - 1, 1);
    const endOfMonth = new Date(y, m, 0, 23, 59, 59);

    const results = await this.prisma.transaction.groupBy({
      by: ['categoryId'],
      where: {
        userId,
        type: TransactionType.DEBIT,   // INVESTMENT excluded — not a spending category
        date: { gte: startOfMonth, lte: endOfMonth },
        categoryId: { not: null },
      },
      _sum: { amount: true },
      orderBy: { _sum: { amount: 'desc' } },
    });

    // Enrich with category names
    const categories = await this.prisma.category.findMany({
      where: { id: { in: results.map(r => r.categoryId!).filter(Boolean) } },
    });
    const categoryMap = new Map(categories.map(c => [c.id, c]));

    return results.map(r => ({
      category: categoryMap.get(r.categoryId!) ?? { name: 'Other', icon: '📦' },
      total: r._sum.amount ?? 0,
    }));
  }

  // Monthly income vs expenses for the last 6 months.
  // Uses a single raw SQL query instead of 12 separate aggregate calls.
  async getByMonth(clerkId: string) {
    const userId = await this.resolveUserId(clerkId);
    const now = new Date();
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    // One query, grouped by year+month — Postgres does all the work
    const rows = await this.prisma.$queryRaw<
      { yr: number; mo: number; type: string; total: number }[]
    >`
      SELECT
        EXTRACT(YEAR FROM date)::int  AS yr,
        EXTRACT(MONTH FROM date)::int AS mo,
        type,
        COALESCE(SUM(amount), 0)      AS total
      FROM "Transaction"
      WHERE "userId" = ${userId}
        AND date >= ${sixMonthsAgo}
        AND type != 'INVESTMENT'
      GROUP BY yr, mo, type
      ORDER BY yr, mo
    `;

    // Build the output array — one entry per month
    const monthNames = ['', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result: { month: string; year: number; income: number; expenses: number }[] = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth() + 1;

      const income = rows.find(r => r.yr === yr && r.mo === mo && r.type === 'CREDIT');
      const expenses = rows.find(r => r.yr === yr && r.mo === mo && r.type === 'DEBIT');

      result.push({
        month: monthNames[mo],
        year: yr,
        income: Number(income?.total ?? 0),
        expenses: Number(expenses?.total ?? 0),
      });
    }

    return result;
  }

  // Get a single transaction by ID
  async findOne(clerkId: string, transactionId: string) {
    const userId = await this.resolveUserId(clerkId);
    const tx = await this.prisma.transaction.findUnique({
      where: { id: transactionId, userId },
      include: { category: true },
    });
    if (!tx) throw new NotFoundException('Transaction not found.');
    return tx;
  }

  // List all categories (for edit dropdown)
  getCategories() {
    return this.prisma.category.findMany({ orderBy: { name: 'asc' } });
  }

  // Update a transaction's category or description
  async update(clerkId: string, transactionId: string, data: { categoryId?: string; description?: string }) {
    const userId = await this.resolveUserId(clerkId);
    return this.prisma.transaction.update({
      where: { id: transactionId, userId },
      data,
      include: { category: true },
    });
  }

  // Create a manual transaction
  async create(clerkId: string, dto: CreateTransactionDto) {
    const userId = await this.resolveUserId(clerkId);
    try {
      return await this.prisma.transaction.create({
        data: {
          userId,
          amount: dto.amount,
          merchant: dto.merchant.trim(),
          description: dto.description?.trim() || null,
          date: new Date(dto.date),
          type: dto.type,
          source: ImportSource.MANUAL,
          categoryId: dto.categoryId || null,
        },
        include: { category: true },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') {
        throw new ConflictException(
          'A transaction with the same merchant, amount, and date already exists.',
        );
      }
      throw e;
    }
  }

  // Delete a manual transaction (imported ones cannot be deleted)
  async remove(clerkId: string, transactionId: string) {
    const userId = await this.resolveUserId(clerkId);
    const tx = await this.prisma.transaction.findUnique({
      where: { id: transactionId, userId },
    });
    if (!tx) throw new NotFoundException('Transaction not found.');
    if (tx.source !== ImportSource.MANUAL) {
      throw new ForbiddenException('Only manually entered transactions can be deleted.');
    }
    await this.prisma.transaction.delete({ where: { id: transactionId } });
    return { message: 'Transaction deleted.' };
  }
}
