import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePlatformDto } from './dto/create-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';
import { CreateSavingDto } from './dto/create-saving.dto';
import { UpdateSavingDto } from './dto/update-saving.dto';

@Injectable()
export class SavingsService {
  constructor(private prisma: PrismaService) {}

  private resolveUserId(clerkId: string): Promise<string> {
    return this.prisma.resolveUserId(clerkId);
  }

  // ─── Platform (wallet) ────────────────────────────────────────────────────

  async createPlatform(clerkId: string, dto: CreatePlatformDto) {
    const userId = await this.resolveUserId(clerkId);
    try {
      return await this.prisma.investmentPlatform.create({
        data: { userId, name: dto.name.trim(), totalAdded: dto.totalAdded, note: dto.note?.trim() || null },
      });
    } catch (e: any) {
      if (e?.code === 'P2002') throw new ConflictException(`Platform "${dto.name}" already exists.`);
      throw e;
    }
  }

  async getPlatforms(clerkId: string) {
    const userId = await this.resolveUserId(clerkId);
    const platforms = await this.prisma.investmentPlatform.findMany({
      where: { userId },
      include: { savings: true },
      orderBy: { createdAt: 'asc' },
    });

    return platforms.map(p => {
      const totalInvested = p.savings.reduce((s, sv) => s + sv.investedAmount + sv.charges, 0);
      const totalCurrentValue = p.savings.reduce((s, sv) => s + sv.currentValue, 0);
      const balance = p.totalAdded - totalInvested;
      return { ...p, totalInvested, totalCurrentValue, balance };
    });
  }

  async updatePlatform(clerkId: string, platformId: string, dto: UpdatePlatformDto) {
    const userId = await this.resolveUserId(clerkId);
    const platform = await this.prisma.investmentPlatform.findUnique({ where: { id: platformId, userId } });
    if (!platform) throw new NotFoundException('Platform not found.');

    if (dto.totalAdded !== undefined) {
      // Guard: can't set totalAdded below what's already invested
      const savings = await this.prisma.saving.findMany({ where: { platformId } });
      const totalInvested = savings.reduce((s, sv) => s + sv.investedAmount + sv.charges, 0);
      if (dto.totalAdded < totalInvested) {
        throw new BadRequestException(
          `Total added (₹${dto.totalAdded}) cannot be less than already invested (₹${totalInvested.toFixed(0)}).`,
        );
      }
    }

    return this.prisma.investmentPlatform.update({
      where: { id: platformId },
      data: {
        ...(dto.totalAdded !== undefined && { totalAdded: dto.totalAdded }),
        ...(dto.note !== undefined && { note: dto.note?.trim() || null }),
      },
    });
  }

  async removePlatform(clerkId: string, platformId: string) {
    const userId = await this.resolveUserId(clerkId);
    const platform = await this.prisma.investmentPlatform.findUnique({ where: { id: platformId, userId } });
    if (!platform) throw new NotFoundException('Platform not found.');
    await this.prisma.investmentPlatform.delete({ where: { id: platformId } });
    return { message: 'Platform deleted.' };
  }

  // ─── Individual savings ───────────────────────────────────────────────────

  async createSaving(clerkId: string, dto: CreateSavingDto) {
    const userId = await this.resolveUserId(clerkId);

    // If linked to a platform, verify it belongs to this user
    if (dto.platformId) {
      const platform = await this.prisma.investmentPlatform.findUnique({
        where: { id: dto.platformId, userId },
        include: { savings: true },
      });
      if (!platform) throw new NotFoundException('Platform not found.');

      const totalInvested = platform.savings.reduce((s, sv) => s + sv.investedAmount + sv.charges, 0);
      const newCost = dto.investedAmount + dto.charges;
      const balance = platform.totalAdded - totalInvested;

      if (newCost > balance) {
        throw new BadRequestException(
          `Insufficient platform balance. Available: ₹${balance.toFixed(0)}, needed: ₹${newCost.toFixed(0)}.`,
        );
      }
    }

    return this.prisma.saving.create({
      data: {
        userId,
        platformId: dto.platformId || null,
        name: dto.name.trim(),
        type: dto.type,
        investedAmount: dto.investedAmount,
        charges: dto.charges,
        currentValue: dto.currentValue,
        startDate: new Date(dto.startDate),
        maturityDate: dto.maturityDate ? new Date(dto.maturityDate) : null,
        note: dto.note?.trim() || null,
      },
      include: { platform: true },
    });
  }

  async getSavings(clerkId: string) {
    const userId = await this.resolveUserId(clerkId);
    const savings = await this.prisma.saving.findMany({
      where: { userId },
      include: { platform: true },
      orderBy: { startDate: 'desc' },
    });

    return savings.map(s => ({
      ...s,
      netCost: s.investedAmount + s.charges,
      gainLoss: s.currentValue - (s.investedAmount + s.charges),
      gainPercent: (((s.currentValue - (s.investedAmount + s.charges)) / (s.investedAmount + s.charges)) * 100),
    }));
  }

  async updateSaving(clerkId: string, savingId: string, dto: UpdateSavingDto) {
    const userId = await this.resolveUserId(clerkId);
    const saving = await this.prisma.saving.findUnique({ where: { id: savingId, userId } });
    if (!saving) throw new NotFoundException('Saving not found.');

    return this.prisma.saving.update({
      where: { id: savingId },
      data: {
        ...(dto.currentValue !== undefined && { currentValue: dto.currentValue }),
        ...(dto.charges !== undefined && { charges: dto.charges }),
        ...(dto.note !== undefined && { note: dto.note?.trim() || null }),
      },
      include: { platform: true },
    });
  }

  async removeSaving(clerkId: string, savingId: string) {
    const userId = await this.resolveUserId(clerkId);
    const saving = await this.prisma.saving.findUnique({ where: { id: savingId, userId } });
    if (!saving) throw new NotFoundException('Saving not found.');
    await this.prisma.saving.delete({ where: { id: savingId } });
    return { message: 'Saving deleted.' };
  }

  // ─── Portfolio summary ────────────────────────────────────────────────────

  async getSummary(clerkId: string) {
    const userId = await this.resolveUserId(clerkId);

    // Aggregate in the database instead of fetching every row and reducing in
    // JS — one small round-trip regardless of how many investments exist.
    const agg = await this.prisma.saving.aggregate({
      where: { userId },
      _sum: { investedAmount: true, charges: true, currentValue: true },
      _count: true,
    });

    const totalInvested = agg._sum.investedAmount ?? 0;
    const totalCharges = agg._sum.charges ?? 0;
    const totalNetCost = totalInvested + totalCharges;
    const totalCurrentValue = agg._sum.currentValue ?? 0;
    const totalGainLoss = totalCurrentValue - totalNetCost;
    const totalGainPercent = totalNetCost > 0 ? (totalGainLoss / totalNetCost) * 100 : 0;

    return {
      totalInvested,
      totalCharges,
      totalNetCost,
      totalCurrentValue,
      totalGainLoss,
      totalGainPercent,
      count: agg._count,
    };
  }
}
