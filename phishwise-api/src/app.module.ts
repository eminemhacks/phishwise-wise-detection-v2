import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import configuration from './config/configuration';
import { AllExceptionsFilter } from './common/filters/http-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { MailModule } from './mail/mail.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ContentModule } from './lessons/content.module';
import { ProgressModule } from './progress/progress.module';
import { AdminModule } from './admin/admin.module';
import { DetectionModule } from './detection/detection.module';
import { HealthController } from './health.controller';

import { User } from './users/user.entity';
import { Progress } from './progress/progress.entity';
import { AuthToken } from './auth/auth-token.entity';
import { Category, Lesson, Quiz } from './lessons/content.entities';
import { QuizAttempt } from './quizzes/quiz-attempt.entity';
import { Scan } from './detection/scan.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env'],
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        type: 'postgres',
        host: config.get('db.host'),
        port: config.get('db.port'),
        username: config.get('db.username'),
        password: config.get('db.password'),
        database: config.get('db.name'),
        entities: [User, Progress, AuthToken, Category, Lesson, Quiz, QuizAttempt, Scan],
        synchronize: false,
        autoLoadEntities: true,
      }),
    }),
    MailModule,
    AuthModule,
    UsersModule,
    ContentModule,
    ProgressModule,
    AdminModule,
    DetectionModule,
  ],
  controllers: [HealthController],
  providers: [
    // JWT guard is global; routes opt out with @Public()
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
