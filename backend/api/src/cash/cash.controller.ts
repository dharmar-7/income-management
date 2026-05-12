import { Controller, Get, Post, Delete, Param, Body, Query, UseGuards } from '@nestjs/common';
import { CashService } from './cash.service';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { AddCashDto } from './dto/add-cash.dto';
import { SpendCashDto } from './dto/spend-cash.dto';

@Controller('cash')
@UseGuards(ClerkAuthGuard)
export class CashController {
  constructor(private service: CashService) {}

  // GET /cash/balance
  @Get('balance')
  getBalance(@CurrentUser() userId: string) {
    return this.service.getBalance(userId);
  }

  // GET /cash/history?page=1&limit=20
  @Get('history')
  getHistory(
    @CurrentUser() userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = parseInt(page ?? '1', 10);
    const l = Math.min(parseInt(limit ?? '20', 10), 100);
    return this.service.getHistory(userId, p, l);
  }

  // POST /cash/add — record cash received
  @Post('add')
  addCash(@CurrentUser() userId: string, @Body() body: AddCashDto) {
    return this.service.addCash(userId, body);
  }

  // POST /cash/spend — record cash spent or deposited
  @Post('spend')
  spendCash(@CurrentUser() userId: string, @Body() body: SpendCashDto) {
    return this.service.spendCash(userId, body);
  }

  // DELETE /cash/:id — remove a mistaken entry
  @Delete(':id')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.service.remove(userId, id);
  }
}
