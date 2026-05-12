import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CategorizerService } from '../import/categorizer.service';
import { SmsParserService, RawSms, ParsedSmsTransaction } from './sms-parser.service';
import { TransactionType } from '@prisma/client';

export interface SmsSyncResult {
  imported: number;
  skipped: number;       // already existed (GPay duplicate etc.)
  failed: number;
  atmTransactions: AtmEntry[];  // returned so mobile can prompt user
}

export interface AtmEntry {
  amount: number;
  date: string;
  rawSms: string;
}

@Injectable()
export class SmsSyncService {
  constructor(
    private prisma: PrismaService,
    private parser: SmsParserService,
    private categorizer: CategorizerService,
  ) {}

  private async resolveUserId(clerkId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found.');
    return user.id;
  }

  async sync(clerkId: string, messages: RawSms[]): Promise<SmsSyncResult> {
    const userId = await this.resolveUserId(clerkId);
    const parsed = this.parser.parse(messages);

    let imported = 0;
    let skipped = 0;
    let failed = 0;
    const atmTransactions: AtmEntry[] = [];

    for (const tx of parsed) {
      try {
        const isDuplicate = await this.isDuplicate(userId, tx);
        if (isDuplicate) {
          skipped++;
          continue;
        }

        const categoryId = this.categorizer.getCategoryId(tx.merchant) || undefined;

        await this.prisma.transaction.create({
          data: {
            userId,
            merchant: tx.merchant,
            amount: tx.amount,
            date: tx.date,
            type: tx.type,
            source: tx.source,
            upiRef: tx.upiRef ?? undefined,
            description: null,
            categoryId,
          },
        });

        imported++;

        // Track ATM transactions to prompt cash-in-hand on mobile
        if (tx.isAtm && tx.type === TransactionType.DEBIT) {
          atmTransactions.push({
            amount: tx.amount,
            date: tx.date.toISOString(),
            rawSms: tx.rawSms,
          });
        }
      } catch {
        failed++;
      }
    }

    // Update last SMS sync timestamp
    await this.prisma.user.update({
      where: { clerkId },
      data: { smsSyncedAt: new Date() },
    });

    return { imported, skipped, failed, atmTransactions };
  }

  // Two-tier deduplication
  private async isDuplicate(userId: string, tx: ParsedSmsTransaction): Promise<boolean> {
    // Tier 1: UPI reference match — most reliable
    if (tx.upiRef) {
      const existing = await this.prisma.transaction.findUnique({
        where: { userId_upiRef: { userId, upiRef: tx.upiRef } },
        select: { id: true },
      });
      if (existing) return true;
    }

    // Tier 2: Same amount on the same calendar day
    // Handles ATM/NEFT that have no UPI ref but may already be manually entered
    const dayStart = new Date(tx.date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(tx.date);
    dayEnd.setHours(23, 59, 59, 999);

    const sameDay = await this.prisma.transaction.findFirst({
      where: {
        userId,
        amount: tx.amount,
        type: tx.type,
        date: { gte: dayStart, lte: dayEnd },
      },
      select: { id: true },
    });

    return !!sameDay;
  }

  // Return the last SMS sync date so mobile knows where to start reading from
  async getLastSyncDate(clerkId: string): Promise<Date | null> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { smsSyncedAt: true },
    });
    return user?.smsSyncedAt ?? null;
  }
}
