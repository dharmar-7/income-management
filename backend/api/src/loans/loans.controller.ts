import {
  Controller, Get, Post, Put, Delete,
  Param, Body, UseGuards,
} from '@nestjs/common';
import { LoansService } from './loans.service';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateLoanDto } from './dto/create-loan.dto';

@Controller('loans')
@UseGuards(ClerkAuthGuard)
export class LoansController {
  constructor(private service: LoansService) {}

  @Get()
  findAll(@CurrentUser() clerkId: string) {
    return this.service.findAll(clerkId);
  }

  @Post()
  create(@CurrentUser() clerkId: string, @Body() dto: CreateLoanDto) {
    return this.service.create(clerkId, dto);
  }

  @Put(':id')
  update(
    @CurrentUser() clerkId: string,
    @Param('id') id: string,
    @Body() dto: { name?: string; note?: string },
  ) {
    return this.service.update(clerkId, id, dto);
  }

  @Post(':id/pay')
  markPaid(@CurrentUser() clerkId: string, @Param('id') id: string) {
    return this.service.markPaid(clerkId, id);
  }

  @Delete(':id')
  remove(@CurrentUser() clerkId: string, @Param('id') id: string) {
    return this.service.remove(clerkId, id);
  }
}
