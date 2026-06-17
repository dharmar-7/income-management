import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SavingsService } from './savings.service';
import { PrismaService } from '../prisma/prisma.service';

// Minimal in-memory Prisma stub — no DB. We stub only the calls the methods
// under test make: resolveUserId, saving.findUnique/update, and (for the
// platform-balance guard) investmentPlatform.findUnique.
function makeMockPrisma(saving: any, platform?: any) {
  return {
    resolveUserId: jest.fn().mockResolvedValue('user-1'),
    saving: {
      findUnique: jest.fn().mockResolvedValue(saving),
      // echo back the merged row so we can assert on the resulting data
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...saving, ...data })),
    },
    investmentPlatform: {
      findUnique: jest.fn().mockResolvedValue(platform ?? null),
    },
  };
}

async function buildService(saving: any, platform?: any) {
  const prisma = makeMockPrisma(saving, platform);
  const module: TestingModule = await Test.createTestingModule({
    providers: [SavingsService, { provide: PrismaService, useValue: prisma }],
  }).compile();
  return { service: module.get(SavingsService), prisma };
}

const baseSaving = {
  id: 's1',
  name: 'Nifty 50 SIP',
  type: 'MUTUAL_FUNDS',
  investedAmount: 1000,
  charges: 0,
  currentValue: 1100,
  sipAmount: 100,
  platformId: null,
  platform: null,
};

describe('SavingsService.contribute', () => {
  it('adds the stored monthly SIP to both invested and current value', async () => {
    const { service, prisma } = await buildService({ ...baseSaving });
    const res = await service.contribute('clerk-1', 's1');

    expect(prisma.saving.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { investedAmount: 1100, currentValue: 1200 } }),
    );
    expect(res.investedAmount).toBe(1100);
    expect(res.currentValue).toBe(1200);
    expect(res.contributed).toBe(100);
    // gain stays the same in absolute terms (100), never an artificial jump
    expect(res.gainLoss).toBe(100);
  });

  it('uses an explicit amount over the stored sipAmount', async () => {
    const { service } = await buildService({ ...baseSaving });
    const res = await service.contribute('clerk-1', 's1', 500);
    expect(res.investedAmount).toBe(1500);
    expect(res.currentValue).toBe(1600);
    expect(res.contributed).toBe(500);
  });

  it('rejects when no SIP amount is set and none is passed', async () => {
    const { service } = await buildService({ ...baseSaving, sipAmount: null });
    await expect(service.contribute('clerk-1', 's1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a contribution that exceeds the platform wallet balance', async () => {
    const platformSaving = {
      ...baseSaving,
      platform: {
        name: 'Groww',
        totalAdded: 1000,
        savings: [{ investedAmount: 1000, charges: 0 }], // balance 0
      },
    };
    const { service } = await buildService(platformSaving);
    await expect(service.contribute('clerk-1', 's1')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('404s when the investment does not exist', async () => {
    const { service } = await buildService(null);
    await expect(service.contribute('clerk-1', 'missing')).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('SavingsService.updateSaving', () => {
  it('applies only the supplied fields (standalone investment)', async () => {
    const { service, prisma } = await buildService({ ...baseSaving });
    await service.updateSaving('clerk-1', 's1', { name: '  Renamed  ', currentValue: 2000 });

    const data = prisma.saving.update.mock.calls[0][0].data;
    expect(data).toEqual({ name: 'Renamed', currentValue: 2000 }); // trimmed; nothing else touched
    expect(prisma.investmentPlatform.findUnique).not.toHaveBeenCalled(); // standalone → no balance check
  });

  it('clears the SIP when sipAmount is set to 0', async () => {
    const { service, prisma } = await buildService({ ...baseSaving });
    await service.updateSaving('clerk-1', 's1', { sipAmount: 0 });
    expect(prisma.saving.update.mock.calls[0][0].data).toEqual({ sipAmount: null });
  });

  it('clears the maturity date when passed null', async () => {
    const { service, prisma } = await buildService({ ...baseSaving });
    await service.updateSaving('clerk-1', 's1', { maturityDate: null });
    expect(prisma.saving.update.mock.calls[0][0].data).toEqual({ maturityDate: null });
  });

  it('rejects raising invested beyond the platform balance', async () => {
    const saving = { ...baseSaving, platformId: 'p1', investedAmount: 1000 };
    const platform = {
      id: 'p1', name: 'Groww', totalAdded: 1000,
      savings: [{ id: 's1', investedAmount: 1000, charges: 0 }], // only this one → available 1000
    };
    const { service } = await buildService(saving, platform);
    // raising to 2000 exceeds the 1000 wallet
    await expect(
      service.updateSaving('clerk-1', 's1', { investedAmount: 2000 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('counts other investments but not this one when checking balance', async () => {
    const saving = { ...baseSaving, platformId: 'p1', investedAmount: 1000 };
    const platform = {
      id: 'p1', name: 'Groww', totalAdded: 5000,
      savings: [
        { id: 's1', investedAmount: 1000, charges: 0 }, // self — excluded
        { id: 's2', investedAmount: 3000, charges: 0 }, // other — counted
      ],
    };
    const { service, prisma } = await buildService(saving, platform);
    // available = 5000 - 3000(other) = 2000; raising self to 2000 just fits
    await service.updateSaving('clerk-1', 's1', { investedAmount: 2000 });
    expect(prisma.saving.update).toHaveBeenCalled();
    // but 2001 would not
    const { service: s2 } = await buildService(saving, platform);
    await expect(
      s2.updateSaving('clerk-1', 's1', { investedAmount: 2001 }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
