import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TakeoutParserService } from './takeout-parser.service';
import { CategorizerService } from './categorizer.service';

export interface ImportSummary {
  imported: number;
  skipped: number;   // duplicates
  failed: number;    // rows that couldn't be parsed
  total: number;
}

@Injectable()
export class ImportService {
  constructor(
    private prisma: PrismaService,
    private parser: TakeoutParserService,
    private categorizer: CategorizerService,
  ) {}

  // Resolve internal DB userId from Clerk ID
  private async resolveUserId(clerkId: string): Promise<string> {
    const user = await this.prisma.user.findUnique({
      where: { clerkId },
      select: { id: true },
    });
    if (!user) throw new NotFoundException('User not found. Please log in again.');
    return user.id;
  }

  async importTakeout(fileBuffer: Buffer, clerkId: string): Promise<ImportSummary> {
    // 1. Resolve Clerk ID → internal DB user ID
    const userId = await this.resolveUserId(clerkId);

    // 2. Parse the raw JSON into clean transaction objects
    const transactions = this.parser.parse(fileBuffer);

    const total = transactions.length;

    // 3. Build the rows to insert and resolve categories
    const rows = transactions.map((tx) => ({
      userId,
      merchant: tx.merchant,
      amount: tx.amount,
      date: tx.date,
      type: tx.type,
      description: tx.description ?? undefined,
      source: tx.source,
      upiRef: tx.upiRef ?? undefined,
      categoryId: this.categorizer.getCategoryId(tx.merchant) || undefined,
    }));

    // 4. Insert all rows — skipDuplicates uses ON CONFLICT DO NOTHING at the DB level
    //    and returns only the count of rows actually inserted (not skipped ones).
    const result = await this.prisma.transaction.createMany({
      data: rows,
      skipDuplicates: true,
    });

    const imported = result.count;
    const skipped = total - imported;
    const failed = 0;

    return { imported, skipped, failed, total };
  }
}
