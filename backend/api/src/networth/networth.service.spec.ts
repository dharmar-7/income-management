import { Test, TestingModule } from '@nestjs/testing';
import { NetworthService } from './networth.service';
import { PrismaService } from '../prisma/prisma.service';

function makeMockPrisma(opts: {
  cashIn?: number;
  cashOut?: number;
  investments?: number;
  history?: { year: number; month: number; netWorth: number }[];
}) {
  const upsert = jest.fn().mockResolvedValue({});
  return {
    prisma: {
      resolveUserId: jest.fn().mockResolvedValue('user-1'),
      cashTransaction: {
        groupBy: jest.fn().mockResolvedValue([
          { flow: 'IN', _sum: { amount: opts.cashIn ?? 0 } },
          { flow: 'OUT', _sum: { amount: opts.cashOut ?? 0 } },
        ]),
      },
      saving: {
        aggregate: jest.fn().mockResolvedValue({ _sum: { currentValue: opts.investments ?? 0 } }),
      },
      netWorthSnapshot: {
        upsert,
        // service reverses this, so return newest-first like the real orderBy
        findMany: jest.fn().mockResolvedValue([...(opts.history ?? [])].reverse()),
      },
    },
    upsert,
  };
}

async function buildService(prisma: any) {
  const module: TestingModule = await Test.createTestingModule({
    providers: [NetworthService, { provide: PrismaService, useValue: prisma }],
  }).compile();
  return module.get(NetworthService);
}

describe('NetworthService', () => {
  it('computes net worth as cash (in − out) + investments', async () => {
    const { prisma } = makeMockPrisma({ cashIn: 5000, cashOut: 2000, investments: 10000 });
    const service = await buildService(prisma);
    const res = await service.getNetWorth('clerk-1');
    expect(res.cash).toBe(3000);
    expect(res.investments).toBe(10000);
    expect(res.netWorth).toBe(13000);
  });

  it('records this month as a snapshot with the computed net worth', async () => {
    const { prisma, upsert } = makeMockPrisma({ cashIn: 1000, investments: 500 });
    const service = await buildService(prisma);
    await service.getNetWorth('clerk-1');
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ cash: 1000, investments: 500, netWorth: 1500 }),
      }),
    );
  });

  it('puts past snapshots before the live current-month point', async () => {
    const { prisma } = makeMockPrisma({
      investments: 100, // → current net worth 100
      history: [{ year: 2020, month: 1, netWorth: 50 }], // a past month
    });
    const service = await buildService(prisma);
    const res = await service.getNetWorth('clerk-1');
    // oldest → newest: the past snapshot first…
    expect(res.history[0]).toEqual({ year: 2020, month: 1, netWorth: 50 });
    // …then the freshly-computed current-month value appended last.
    expect(res.history[res.history.length - 1].netWorth).toBe(res.netWorth);
    expect(res.history.length).toBe(2);
  });

  it('handles a user with no cash entries (net worth = investments)', async () => {
    const { prisma } = makeMockPrisma({ investments: 7777 });
    const service = await buildService(prisma);
    const res = await service.getNetWorth('clerk-1');
    expect(res.cash).toBe(0);
    expect(res.netWorth).toBe(7777);
  });
});
