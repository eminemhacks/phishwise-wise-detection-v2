import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsIn } from 'class-validator';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, UserStatus } from '../users/user.entity';

class SetStatusDto {
  @IsIn(['active', 'inactive', 'suspended']) status: UserStatus;
}

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  // Users
  @Get('users')
  users() {
    return this.admin.listUsers();
  }

  @Patch('users/:id/status')
  setStatus(@Param('id') id: string, @Body() dto: SetStatusDto) {
    return this.admin.setUserStatus(id, dto.status);
  }

  // Content — lessons
  @Post('lessons')
  createLesson(@Body() body: any) {
    return this.admin.createLesson(body);
  }

  @Patch('lessons/:id')
  updateLesson(@Param('id') id: string, @Body() body: any) {
    return this.admin.updateLesson(id, body);
  }

  @Delete('lessons/:id')
  deleteLesson(@Param('id') id: string) {
    return this.admin.deleteLesson(id);
  }

  // Content — quizzes
  @Post('quizzes')
  createQuiz(@Body() body: any) {
    return this.admin.createQuiz(body);
  }

  @Patch('quizzes/:id')
  updateQuiz(@Param('id') id: string, @Body() body: any) {
    return this.admin.updateQuiz(id, body);
  }

  @Delete('quizzes/:id')
  deleteQuiz(@Param('id') id: string) {
    return this.admin.deleteQuiz(id);
  }

  // Analytics
  @Get('analytics/overview')
  overview() {
    return this.admin.overview();
  }

  @Get('analytics/quiz-stats')
  quizStats() {
    return this.admin.quizStats();
  }

  @Get('analytics/category-completion')
  categoryCompletion() {
    return this.admin.categoryCompletion();
  }

  @Get('analytics/badge-distribution')
  badgeDistribution() {
    return this.admin.badgeDistribution();
  }
}
