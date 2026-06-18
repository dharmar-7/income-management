import { Injectable } from '@nestjs/common';
import { CashFlow } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NetworthService {
  constructor(private prisma: PrismaService) {}

  private resolveUserId(clerkId: string): Promise<string> {
    return this.prisma.resolveUserId(clerkId);
  }

  // Net worth = cash in hand + investment current value.
  // (No liabilities module wired in yet — loans can be subtracted here later.)
  async getNetWorth(clerkId: string) {
    const userId = await this.resolveUserId(clerkId);

    // Phase 1: cash + investments in parallel (was 2 sequential awaits).
    const [cashGrouped, invAgg] = await Promise.all([
      this.prisma.cashTransaction.groupBy({
        by: ['flow'],
        where: { userId },
        _sum: { amount: true },
      }),
      this.prisma.saving.aggregate({
        where: { userId },
        _sum: { currentValue: true },
      }),
    ]);

    const cashIn  = cashGrouped.find(g => g.flow === CashFlow.IN)?._sum.amount  ?? 0;
    const cashOut = cashGrouped.find(g => g.flow === CashFlow.OUT)?._sum.amount ?? 0;
    const cash = cashIn - cashOut;
    const investments = invAgg._sum.currentValue ?? 0;
    const netWorth = cash + investments;

    const now = new Date();
    const year  = now.getFullYear();
    const month = now.getMonth() + 1;

    // Phase 2: upsert current snapshot + fetch history in parallel.
    // findMany excludes the current month so we can append the fresh value
    // without depending on the upsert completing first.
    const [, snapshots] = await Promise.all([
      this.prisma.netWorthSnapshot.upsert({
        where: { userId_year_month: { userId, year, month } },
        update: { cash, investments, netWorth, capturedAt: now },
        create: { userId, year, month, cash, investments, netWorth },
      }),
      this.prisma.netWorthSnapshot.findMany({
        where: { userId, NOT: { year, month } },
        orderBy: [{ year: 'desc' }, { month: 'desc' }],
        take: 11,
      }),
    ]);

    // Build history oldest→newest, appending the live current-month point.
    const history = [
      ...snapshots.map(s => ({ year: s.year, month: s.month, netWorth: s.netWorth })).reverse(),
      { year, month, netWorth },
    ];

    return { cash, investments, netWorth, history };
  }
}
