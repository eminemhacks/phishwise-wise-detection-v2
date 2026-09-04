import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ContentService } from './content.service';
import { ContentController } from './content.controller';
import { Category, Lesson, Quiz } from './content.entities';
import { User } from '../users/user.entity';
import { Progress } from '../progress/progress.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Lesson, Quiz, User, Progress])],
  controllers: [ContentController],
  providers: [ContentService],
  exports: [ContentService],
})
export class ContentModule {}
