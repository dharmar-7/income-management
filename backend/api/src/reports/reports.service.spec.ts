import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ReportsService } from './reports.service';
import { PrismaService } from '../prisma/prisma.service';
import { TransactionType } from '@prisma/client';

function makeMockPrisma() {
  const prisma: any = {
    user: { findUnique: jest.fn() },
    transaction: {
      aggregate: jest.fn(),
      count: jest.fn(),
      groupBy: jest.fn(),
      findMany: jest.fn(),
    },
    category: { findMany: jest.fn() },
  };
  // Mirror PrismaService.resolveUserId so existing user.findUnique mocks still drive behaviour
  prisma.resolveUserId = jest.fn(async (clerkId: string) => {
    const u = await prisma.user.findUnique({ where: { clerkId }, select: { id: true } });
    if (!u) throw new NotFoundException('User not found.');
    return u.id;
  });
  return prisma;
}

describe('ReportsService', () => {
  let service: ReportsService;
  let prisma: ReturnType<typeof makeMockPrisma>;

  const MOCK_USER = { id: 'internal-user-id' };
  const CLERK_ID = 'clerk_abc';

  beforeEach(async () => {
    prisma = makeMockPrisma();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
    prisma.user.findUnique.mockResolvedValue(MOCK_USER);
  });

  // ─── getMonthlyReport ────────────────────────────────────────────────────

  describe('getMonthlyReport', () => {
    beforeEach(() => {
      // Set up all the parallel queries to return sensible defaults
      prisma.transaction.aggregate
        .mockResolvedValueOnce({ _sum: { amount: 60000 } })  // income
        .mockResolvedValueOnce({ _sum: { amount: 25000 } }); // expenses
      prisma.transaction.count.mockResolvedValue(30);
      prisma.transaction.groupBy.mockResolvedValue([]);
      prisma.category.findMany.mockResolvedValue([]);
    });

    it('returns correct month and year', async () => {
      const result = await service.getMonthlyReport(CLERK_ID, 4, 2026);
      expect(result.month).toBe(4);
      expect(result.year).toBe(2026);
    });

    it('calculates netSavings correctly', async () => {
      const result = await service.getMonthlyReport(CLERK_ID, 4, 2026);
      expect(result.summary.totalIncome).toBe(60000);
      expect(result.summary.totalExpenses).toBe(25000);
      expect(result.summary.netSavings).toBe(35000);
    });

    it('includes transactionCount', async () => {
      const result = await service.getMonthlyReport(CLERK_ID, 4, 2026);
      expect(result.summary.transactionCount).toBe(30);
    });

    it('throws NotFoundException for unknown user', async () => {
      prisma.user.findUnique.mockResolvedValue(null);
      await expect(service.getMonthlyReport(CLERK_ID, 4, 2026)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── generateCsv ────────────────────────────────────────────────────────

  describe('generateCsv', () => {
    it('includes the correct CSV header row', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      const csv = await service.generateCsv(CLERK_ID, 4, 2026);
      expect(csv.split('\n')[0]).toBe('Date,Merchant,Type,Category,Amount,Description');
    });

    it('formats a transaction row correctly', async () => {
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-1',
          date: new Date('2026-04-15T10:00:00.000Z'),
          merchant: 'Swiggy',
          type: TransactionType.DEBIT,
          amount: 450,
          description: null,
          category: { name: 'Food & Dining' },
        },
      ]);

      const csv = await service.generateCsv(CLERK_ID, 4, 2026);
      const rows = csv.split('\n');
      expect(rows).toHaveLength(2); // header + 1 data row
      expect(rows[1]).toBe('2026-04-15,Swiggy,DEBIT,Food & Dining,450.00,');
    });

    it('wraps merchant names containing commas in double-quotes', async () => {
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-2',
          date: new Date('2026-04-01T10:00:00.000Z'),
          merchant: 'Store, Inc.',
          type: TransactionType.DEBIT,
          amount: 100,
          description: null,
          category: null,
        },
      ]);

      const csv = await service.generateCsv(CLERK_ID, 4, 2026);
      const dataRow = csv.split('\n')[1];
      // The merchant with a comma must be quoted
      expect(dataRow).toContain('"Store, Inc."');
    });

    it('escapes double-quotes inside merchant names', async () => {
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-3',
          date: new Date('2026-04-01T10:00:00.000Z'),
          merchant: 'Say "Hello" Store',
          type: TransactionType.DEBIT,
          amount: 50,
          description: null,
          category: null,
        },
      ]);

      const csv = await service.generateCsv(CLERK_ID, 4, 2026);
      const dataRow = csv.split('\n')[1];
      // RFC 4180: internal quotes are doubled
      expect(dataRow).toContain('"Say ""Hello"" Store"');
    });

    it('uses "Uncategorized" when category is null', async () => {
      prisma.transaction.findMany.mockResolvedValue([
        {
          id: 'tx-4',
          date: new Date('2026-04-01T10:00:00.000Z'),
          merchant: 'Unknown Shop',
          type: TransactionType.DEBIT,
          amount: 200,
          description: null,
          category: null,
        },
      ]);

      const csv = await service.generateCsv(CLERK_ID, 4, 2026);
      expect(csv).toContain('Uncategorized');
    });

    it('returns only a header when there are no transactions', async () => {
      prisma.transaction.findMany.mockResolvedValue([]);
      const csv = await service.generateCsv(CLERK_ID, 4, 2026);
      expect(csv.trim()).toBe('Date,Merchant,Type,Category,Amount,Description');
    });
  });
});
