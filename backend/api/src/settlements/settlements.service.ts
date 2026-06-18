import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSettlementDto, SettleDto } from './dto/create-settlement.dto';

@Injectable()
export class SettlementsService {
  constructor(private prisma: PrismaService) {}

  private resolveUserId(clerkId: string) {
    return this.prisma.resolveUserId(clerkId);
  }

  async findAll(clerkId: string) {
    const userId = await this.resolveUserId(clerkId);
    const settlements = await this.prisma.settlement.findMany({
      where: { userId },
      orderBy: [{ status: 'asc' }, { transferredAt: 'desc' }],
    });

    // Attach linked transaction snippets if present
    const txIds = settlements
      .flatMap(s => [s.originalTxId, s.repaymentTxId])
      .filter((id): id is string => !!id);

    const txMap = new Map<string, any>();
    if (txIds.length > 0) {
      const txs = await this.prisma.transaction.findMany({
        where: { id: { in: txIds } },
        select: { id: true, merchant: true, amount: true, date: true, type: true },
      });
      txs.forEach(t => txMap.set(t.id, t));
    }

    return settlements.map(s => ({
      ...s,
      originalTx:  s.originalTxId  ? txMap.get(s.originalTxId)  ?? null : null,
      repaymentTx: s.repaymentTxId ? txMap.get(s.repaymentTxId) ?? null : null,
    }));
  }

  async create(clerkId: string, dto: CreateSettlementDto) {
    const userId = await this.resolveUserId(clerkId);

    // If linking to a transaction, verify ownership and mark it TRANSFER
    if (dto.originalTxId) {
      await this.markTxAsTransfer(userId, dto.originalTxId);
    }

    return this.prisma.settlement.create({
      data: {
        userId,
        personName: dto.personName,
        amount: dto.amount,
        direction: dto.direction,
        transferredAt: new Date(dto.transferredAt),
        originalTxId: dto.originalTxId ?? null,
        note: dto.note ?? null,
      },
    });
  }

  async settle(clerkId: string, id: string, dto: SettleDto) {
    const userId = await this.resolveUserId(clerkId);
    const settlement = await this.assertOwner(userId, id);

    if (settlement.status === 'SETTLED') {
      throw new BadRequestException('Settlement is already marked as settled.');
    }

    // Mark the repayment transaction as TRANSFER if provided
    if (dto.repaymentTxId) {
      await this.markTxAsTransfer(userId, dto.repaymentTxId);
    }

    return this.prisma.settlement.update({
      where: { id },
      data: {
        status: 'SETTLED',
        settledAt: dto.settledAt ? new Date(dto.settledAt) : new Date(),
        ...(dto.repaymentTxId && { repaymentTxId: dto.repaymentTxId }),
      },
    });
  }

  async cancel(clerkId: string, id: string) {
    const userId = await this.resolveUserId(clerkId);
    const settlement = await this.assertOwner(userId, id);

    // Restore linked transactions to their original types
    if (settlement.originalTxId) {
      const originalType = settlement.direction === 'SENT' ? 'DEBIT' : 'CREDIT';
      await this.prisma.transaction.updateMany({
        where: { id: settlement.originalTxId, userId },
        data: { type: originalType as any },
      });
    }
    if (settlement.repaymentTxId) {
      const repayType = settlement.direction === 'SENT' ? 'CREDIT' : 'DEBIT';
      await this.prisma.transaction.updateMany({
        where: { id: settlement.repaymentTxId, userId },
        data: { type: repayType as any },
      });
    }

    await this.prisma.settlement.delete({ where: { id } });
    return { ok: true };
  }

  // Finds pending settlements that a given transaction could repay
  async getSuggestions(clerkId: string, txId: string) {
    const userId = await this.resolveUserId(clerkId);
    const tx = await this.prisma.transaction.findFirst({ where: { id: txId, userId } });
    if (!tx) return [];

    // If tx is CREDIT (money coming in) → could repay a SENT settlement (you sent, now receiving it back)
    // If tx is DEBIT  (money going out) → could repay a RECEIVED settlement (they sent, you're returning)
    const matchDirection = tx.type === 'CREDIT' ? 'SENT' : 'RECEIVED';
    const windowMs = 3 * 24 * 60 * 60 * 1000;
    const windowStart = new Date(tx.date.getTime() - windowMs);
    const windowEnd   = new Date(tx.date.getTime() + windowMs);

    return this.prisma.settlement.findMany({
      where: {
        userId,
        amount: tx.amount,
        direction: matchDirection,
        status: 'PENDING',
        repaymentTxId: null,
        transferredAt: { gte: windowStart, lte: windowEnd },
      },
    });
  }

  // ── helpers ──────────────────────────────────────────────────────────────────

  private async assertOwner(userId: string, id: string) {
    const s = await this.prisma.settlement.findFirst({ where: { id, userId } });
    if (!s) throw new NotFoundException('Settlement not found');
    return s;
  }

  private async markTxAsTransfer(userId: string, txId: string) {
    const tx = await this.prisma.transaction.findFirst({ where: { id: txId, userId } });
    if (!tx) throw new NotFoundException(`Transaction ${txId} not found`);
    await this.prisma.transaction.update({
      where: { id: txId },
      data: { type: 'TRANSFER' as any },
    });
  }
}
