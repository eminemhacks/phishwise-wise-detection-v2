import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { User } from '../users/user.entity';
import { Progress } from '../progress/progress.entity';
import { Category, Lesson, Quiz } from '../lessons/content.entities';
import { QuizAttempt } from '../quizzes/quiz-attempt.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([User, Progress, Category, Lesson, Quiz, QuizAttempt]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
})
export class AdminModule {}
