import { Injectable, NotFoundException } from '@nestjs/common';
import { Goal } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';

// Enrich a goal row with the derived progress numbers the UI needs.
function withProgress(g: Goal) {
  const remaining = Math.max(0, g.targetAmount - g.savedAmount);
  const percent = g.targetAmount > 0 ? Math.min(100, (g.savedAmount / g.targetAmount) * 100) : 0;
  const reached = g.savedAmount >= g.targetAmount;
  return { ...g, remaining, percent, reached };
}

@Injectable()
export class GoalsService {
  constructor(private prisma: PrismaService) {}

  private resolveUserId(clerkId: string): Promise<string> {
    return this.prisma.resolveUserId(clerkId);
  }

  async getGoals(clerkId: string) {
    const userId = await this.resolveUserId(clerkId);
    const goals = await this.prisma.goal.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });
    return goals.map(withProgress);
  }

  async createGoal(clerkId: string, dto: CreateGoalDto) {
    const userId = await this.resolveUserId(clerkId);
    const goal = await this.prisma.goal.create({
      data: {
        userId,
        name: dto.name.trim(),
        icon: dto.icon?.trim() || '🎯',
        targetAmount: dto.targetAmount,
        savedAmount: dto.savedAmount ?? 0,
        targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        note: dto.note?.trim() || null,
      },
    });
    return withProgress(goal);
  }

  async updateGoal(clerkId: string, goalId: string, dto: UpdateGoalDto) {
    const userId = await this.resolveUserId(clerkId);
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId, userId } });
    if (!goal) throw new NotFoundException('Goal not found.');

    const updated = await this.prisma.goal.update({
      where: { id: goalId },
      data: {
        ...(dto.name !== undefined && { name: dto.name.trim() }),
        ...(dto.icon !== undefined && { icon: dto.icon?.trim() || '🎯' }),
        ...(dto.targetAmount !== undefined && { targetAmount: dto.targetAmount }),
        ...(dto.savedAmount !== undefined && { savedAmount: Math.max(0, dto.savedAmount) }),
        ...(dto.targetDate !== undefined && {
          targetDate: dto.targetDate ? new Date(dto.targetDate) : null,
        }),
        ...(dto.note !== undefined && { note: dto.note?.trim() || null }),
      },
    });
    return withProgress(updated);
  }

  // Add money toward a goal (or withdraw with a negative amount). Floored at 0.
  async contribute(clerkId: string, goalId: string, amount: number) {
    const userId = await this.resolveUserId(clerkId);
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId, userId } });
    if (!goal) throw new NotFoundException('Goal not found.');

    const newSaved = Math.max(0, goal.savedAmount + amount);
    const updated = await this.prisma.goal.update({
      where: { id: goalId },
      data: { savedAmount: newSaved },
    });
    return withProgress(updated);
  }

  async remove(clerkId: string, goalId: string) {
    const userId = await this.resolveUserId(clerkId);
    const goal = await this.prisma.goal.findUnique({ where: { id: goalId, userId } });
    if (!goal) throw new NotFoundException('Goal not found.');
    await this.prisma.goal.delete({ where: { id: goalId } });
    return { message: 'Goal deleted.' };
  }
}
