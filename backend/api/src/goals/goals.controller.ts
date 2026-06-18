import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { GoalsService } from './goals.service';
import { ClerkAuthGuard } from '../auth/clerk.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import { CreateGoalDto } from './dto/create-goal.dto';
import { UpdateGoalDto } from './dto/update-goal.dto';
import { ContributeGoalDto } from './dto/contribute-goal.dto';

@Controller('goals')
@UseGuards(ClerkAuthGuard)
export class GoalsController {
  constructor(private service: GoalsService) {}

  @Get()
  getGoals(@CurrentUser() userId: string) {
    return this.service.getGoals(userId);
  }

  @Post()
  createGoal(@CurrentUser() userId: string, @Body() dto: CreateGoalDto) {
    return this.service.createGoal(userId, dto);
  }

  @Patch(':id')
  updateGoal(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: UpdateGoalDto) {
    return this.service.updateGoal(userId, id, dto);
  }

  // Add money toward a goal (negative amount withdraws)
  @Post(':id/contribute')
  contribute(@CurrentUser() userId: string, @Param('id') id: string, @Body() dto: ContributeGoalDto) {
    return this.service.contribute(userId, id, dto.amount);
  }

  @Delete(':id')
  remove(@CurrentUser() userId: string, @Param('id') id: string) {
    return this.service.remove(userId, id);
  }
}
