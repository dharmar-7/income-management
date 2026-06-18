import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecurringDto } from './dto/create-recurring.dto';

@Injectable()
export class RecurringService {
  constructor(private prisma: PrismaService) {}

  private resolveUserId(clerkId: string) {
    return this.prisma.resolveUserId(clerkId);
  }

  async findAll(clerkId: string) {
    const userId = await this.resolveUserId(clerkId);
    return this.prisma.recurringTransaction.findMany({
      where: { userId },
      include: { category: true },
      orderBy: { nextDueDate: 'asc' },
    });
  }

  async create(clerkId: string, dto: CreateRecurringDto) {
    const userId = await this.resolveUserId(clerkId);
    const startDate = new Date(dto.startDate);
    const nextDueDate = this.firstNextDue(dto.frequency, startDate, dto.dayOfMonth, dto.dayOfWeek);

    return this.prisma.recurringTransaction.create({
      data: {
        userId,
        name: dto.name,
        amount: dto.amount,
        type: dto.type as any,
        frequency: dto.frequency as any,
        dayOfMonth: dto.dayOfMonth ?? null,
        dayOfWeek: dto.dayOfWeek ?? null,
        startDate,
        nextDueDate,
        categoryId: dto.categoryId ?? null,
        note: dto.note ?? null,
      },
      include: { category: true },
    });
  }

  async update(clerkId: string, id: string, dto: Partial<CreateRecurringDto>) {
    await this.assertOwner(clerkId, id);
    return this.prisma.recurringTransaction.update({
      where: { id },
      data: {
        ...(dto.name !== undefined && { name: dto.name }),
        ...(dto.amount !== undefined && { amount: dto.amount }),
        ...(dto.categoryId !== undefined && { categoryId: dto.categoryId }),
        ...(dto.note !== undefined && { note: dto.note }),
      },
      include: { category: true },
    });
  }

  async markPaid(clerkId: string, id: string) {
    const userId = await this.resolveUserId(clerkId);
    const rec = await this.assertOwner(clerkId, id);

    const nextDueDate = this.advanceNextDue(
      rec.frequency as string,
      rec.nextDueDate,
      rec.dayOfMonth,
    );

    // Record it as a transaction so it shows up in history
    await this.prisma.transaction.create({
      data: {
        userId,
        amount: rec.amount,
        merchant: rec.name,
        description: `Recurring payment: ${rec.name}`,
        date: new Date(),
        type: rec.type,
        source: 'MANUAL',
        categoryId: rec.categoryId ?? null,
      },
    });

    return this.prisma.recurringTransaction.update({
      where: { id },
      data: { nextDueDate },
      include: { category: true },
    });
  }

  async remove(clerkId: string, id: string) {
    await this.assertOwner(clerkId, id);
    await this.prisma.recurringTransaction.delete({ where: { id } });
    return { ok: true };
  }

  // ── helpers ────────────────────────────────────────────────────────────────

  private async assertOwner(clerkId: string, id: string) {
    const userId = await this.resolveUserId(clerkId);
    const rec = await this.prisma.recurringTransaction.findFirst({ where: { id, userId } });
    if (!rec) throw new NotFoundException('Recurring transaction not found');
    return rec;
  }

  private firstNextDue(
    frequency: string,
    startDate: Date,
    dayOfMonth?: number | null,
    dayOfWeek?: number | null,
  ): Date {
    const now = new Date();

    if (frequency === 'MONTHLY') {
      const day = dayOfMonth ?? startDate.getDate();
      let d = new Date(now.getFullYear(), now.getMonth(), day);
      if (d <= now) d = new Date(now.getFullYear(), now.getMonth() + 1, day);
      return d;
    }

    if (frequency === 'WEEKLY') {
      const target = dayOfWeek ?? startDate.getDay();
      const d = new Date(now);
      d.setHours(0, 0, 0, 0);
      let diff = target - d.getDay();
      if (diff <= 0) diff += 7;
      d.setDate(d.getDate() + diff);
      return d;
    }

    // YEARLY — same month/day as start, next future occurrence
    const d = new Date(now.getFullYear(), startDate.getMonth(), startDate.getDate());
    if (d <= now) d.setFullYear(d.getFullYear() + 1);
    return d;
  }

  private advanceNextDue(frequency: string, current: Date, dayOfMonth: number | null): Date {
    const d = new Date(current);
    if (frequency === 'MONTHLY') {
      d.setMonth(d.getMonth() + 1);
      if (dayOfMonth) d.setDate(dayOfMonth);
    } else if (frequency === 'WEEKLY') {
      d.setDate(d.getDate() + 7);
    } else {
      d.setFullYear(d.getFullYear() + 1);
    }
    return d;
  }
}
