import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { PrismaService } from '../prisma/prisma.service';

function makeMockPrisma(goal: any) {
  return {
    resolveUserId: jest.fn().mockResolvedValue('user-1'),
    goal: {
      findUnique: jest.fn().mockResolvedValue(goal),
      findMany: jest.fn().mockResolvedValue(goal ? [goal] : []),
      create: jest.fn().mockImplementation(({ data }) => Promise.resolve({ id: 'g1', ...data })),
      update: jest.fn().mockImplementation(({ data }) => Promise.resolve({ ...goal, ...data })),
      delete: jest.fn().mockResolvedValue({}),
    },
  };
}

async function buildService(goal: any) {
  const prisma = makeMockPrisma(goal);
  const module: TestingModule = await Test.createTestingModule({
    providers: [GoalsService, { provide: PrismaService, useValue: prisma }],
  }).compile();
  return { service: module.get(GoalsService), prisma };
}

const baseGoal = {
  id: 'g1',
  name: 'Goa trip',
  icon: '🏖️',
  targetAmount: 1000,
  savedAmount: 400,
  targetDate: null,
  note: null,
};

describe('GoalsService', () => {
  it('computes progress (remaining, percent, reached)', async () => {
    const { service } = await buildService({ ...baseGoal });
    const [g] = await service.getGoals('clerk-1');
    expect(g.remaining).toBe(600);
    expect(g.percent).toBe(40);
    expect(g.reached).toBe(false);
  });

  it('caps percent at 100 and marks reached when over-saved', async () => {
    const { service } = await buildService({ ...baseGoal, savedAmount: 1200 });
    const [g] = await service.getGoals('clerk-1');
    expect(g.percent).toBe(100);
    expect(g.remaining).toBe(0);
    expect(g.reached).toBe(true);
  });

  it('contributes money toward a goal', async () => {
    const { service } = await buildService({ ...baseGoal });
    const g = await service.contribute('clerk-1', 'g1', 250);
    expect(g.savedAmount).toBe(650);
  });

  it('floors savedAmount at 0 on an over-withdrawal', async () => {
    const { service, prisma } = await buildService({ ...baseGoal });
    const g = await service.contribute('clerk-1', 'g1', -999);
    expect(g.savedAmount).toBe(0);
    expect(prisma.goal.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { savedAmount: 0 } }),
    );
  });

  it('defaults the icon when none is given on create', async () => {
    const { service } = await buildService(null);
    const g = await service.createGoal('clerk-1', { name: 'Emergency fund', targetAmount: 50000 });
    expect(g.icon).toBe('🎯');
    expect(g.savedAmount).toBe(0);
    expect(g.remaining).toBe(50000);
  });

  it('404s when contributing to a missing goal', async () => {
    const { service } = await buildService(null);
    await expect(service.contribute('clerk-1', 'missing', 100)).rejects.toBeInstanceOf(NotFoundException);
  });
});
