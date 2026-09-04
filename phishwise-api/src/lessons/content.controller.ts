import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ContentService } from './content.service';
import { Public } from '../common/decorators/public.decorator';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';

@Controller()
export class ContentController {
  constructor(private readonly content: ContentService) {}

  @Public()
  @Get('categories')
  categories() {
    return this.content.getCategories();
  }

  @Public()
  @Get('lessons')
  lessons() {
    return this.content.getLessons();
  }

  @Public()
  @Get('lessons/learning-path')
  learningPath() {
    return this.content.getLearningPath();
  }

  @Public()
  @Get('lessons/:id')
  lesson(@Param('id') id: string) {
    return this.content.getLesson(id);
  }

  @Public()
  @Get('quizzes')
  quizzes() {
    return this.content.getQuizzes();
  }

  @Public()
  @Get('quizzes/:id')
  quiz(@Param('id') id: string) {
    return this.content.getQuiz(id);
  }

  @Public()
  @Get('daily-challenge')
  daily() {
    return this.content.getDailyChallenge();
  }

  @UseGuards(JwtAuthGuard)
  @Get('leaderboard')
  leaderboard(@CurrentUser() user: JwtUser) {
    return this.content.getLeaderboard(user.sub);
  }
}
