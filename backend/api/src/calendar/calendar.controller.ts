import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { CalendarService } from './calendar.service';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Controller('calendar')
@UseGuards(ClerkAuthGuard)
export class CalendarController {
  constructor(private service: CalendarService) {}

  // GET /calendar?days=60 — upcoming dated items across the app.
  @Get()
  getUpcoming(@CurrentUser() userId: string, @Query('days') days?: string) {
    const n = parseInt(days ?? '', 10);
    const window = isNaN(n) ? 60 : Math.min(Math.max(n, 1), 365);
    return this.service.getUpcoming(userId, window);
  }
}
