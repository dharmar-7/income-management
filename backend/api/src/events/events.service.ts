import { Injectable, NotFoundException } from '@nestjs/common';
import { Event, EventType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';

export const EVENT_ICON: Record<EventType, string> = {
  BIRTHDAY: '🎂',
  ANNIVERSARY: '💍',
  MEMORIAL: '🕯️',
  FESTIVAL: '🎊',
  CUSTOM: '🗓️',
};

// Pure: given an original date and "today", find the next yearly occurrence.
export function occurrenceInfo(date: Date, today: Date) {
  const t0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const month = date.getMonth();
  const day = date.getDate();
  let next = new Date(t0.getFullYear(), month, day);
  if (next < t0) next = new Date(t0.getFullYear() + 1, month, day);
  const daysUntil = Math.round((next.getTime() - t0.getTime()) / 86_400_000);
  // Years completed on the next occurrence (e.g. the age they'll turn).
  const turning = next.getFullYear() - date.getFullYear();
  return { next, daysUntil, isToday: daysUntil === 0, turning };
}

@Injectable()
export class EventsService {
  constructor(private prisma: PrismaService) {}

  private resolveUserId(clerkId: string): Promise<string> {
    return this.prisma.resolveUserId(clerkId);
  }

  private enrich(e: Event) {
    const info = occurrenceInfo(e.date, new Date());
    return {
      ...e,
      icon: EVENT_ICON[e.type],
      nextOccurrence: info.next.toISOString(),
      daysUntil: info.daysUntil,
      isToday: info.isToday,
      turning: info.turning,
    };
  }

  async list(clerkId: string) {
    const userId = await this.resolveUserId(clerkId);
    const events = await this.prisma.event.findMany({ where: { userId } });
    return events.map(e => this.enrich(e)).sort((a, b) => a.daysUntil - b.daysUntil);
  }

  async create(clerkId: string, dto: CreateEventDto) {
    const userId = await this.resolveUserId(clerkId);
    const event = await this.prisma.event.create({
      data: {
        userId,
        title: dto.title.trim(),
        type: dto.type ?? 'BIRTHDAY',
        date: new Date(dto.date),
        isSelf: dto.isSelf ?? false,
        personName: dto.personName?.trim() || null,
        notifyDaysBefore: dto.notifyDaysBefore ?? 0,
        note: dto.note?.trim() || null,
      },
    });
    return this.enrich(event);
  }

  async update(clerkId: string, id: string, dto: UpdateEventDto) {
    const userId = await this.resolveUserId(clerkId);
    const event = await this.prisma.event.findUnique({ where: { id, userId } });
    if (!event) throw new NotFoundException('Event not found.');
    const updated = await this.prisma.event.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title.trim() }),
        ...(dto.type !== undefined && { type: dto.type }),
        ...(dto.date !== undefined && { date: new Date(dto.date) }),
        ...(dto.isSelf !== undefined && { isSelf: dto.isSelf }),
        ...(dto.personName !== undefined && { personName: dto.personName?.trim() || null }),
        ...(dto.notifyDaysBefore !== undefined && { notifyDaysBefore: dto.notifyDaysBefore }),
        ...(dto.note !== undefined && { note: dto.note?.trim() || null }),
      },
    });
    return this.enrich(updated);
  }

  async remove(clerkId: string, id: string) {
    const userId = await this.resolveUserId(clerkId);
    const event = await this.prisma.event.findUnique({ where: { id, userId } });
    if (!event) throw new NotFoundException('Event not found.');
    await this.prisma.event.delete({ where: { id } });
    return { message: 'Event deleted.' };
  }
}
