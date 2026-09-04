import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { IsBoolean, IsInt, IsString, Min } from 'class-validator';
import { ProgressService } from './progress.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, JwtUser } from '../common/decorators/current-user.decorator';

class RecordQuizDto {
  @IsString() quizId: string;
  @IsInt() @Min(0) score: number;
}

class DailyChallengeDto {
  @IsBoolean() correct: boolean;
}

@UseGuards(JwtAuthGuard)
@Controller('progress')
export class ProgressController {
  constructor(private readonly progress: ProgressService) {}

  @Get()
  snapshot(@CurrentUser() user: JwtUser) {
    return this.progress.snapshot(user.sub);
  }

  @Post('lessons/:lessonId/complete')
  completeLesson(
    @CurrentUser() user: JwtUser,
    @Param('lessonId') lessonId: string,
  ) {
    return this.progress.completeLesson(user.sub, lessonId);
  }

  @Post('lessons/:lessonId/bookmark')
  bookmark(@CurrentUser() user: JwtUser, @Param('lessonId') lessonId: string) {
    return this.progress.toggleBookmark(user.sub, lessonId);
  }

  @Post('quizzes/record')
  recordQuiz(@CurrentUser() user: JwtUser, @Body() dto: RecordQuizDto) {
    return this.progress.recordQuiz(user.sub, dto.quizId, dto.score);
  }

  @Post('daily-challenge')
  daily(@CurrentUser() user: JwtUser, @Body() dto: DailyChallengeDto) {
    return this.progress.completeDailyChallenge(user.sub, dto.correct);
  }

  @Post('reset')
  reset(@CurrentUser() user: JwtUser) {
    return this.progress.reset(user.sub);
  }
}
