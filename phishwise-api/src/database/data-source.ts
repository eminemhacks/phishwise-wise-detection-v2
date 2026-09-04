import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { User } from '../users/user.entity';
import { Progress } from '../progress/progress.entity';
import { AuthToken } from '../auth/auth-token.entity';
import { Category, Lesson, Quiz } from '../lessons/content.entities';
import { QuizAttempt } from '../quizzes/quiz-attempt.entity';
import { Scan } from '../detection/scan.entity';

loadEnv();

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT ?? '', 10) || 5432,
  username: process.env.DB_USERNAME || 'phishwise',
  password: process.env.DB_PASSWORD || 'phishwise',
  database: process.env.DB_NAME || 'phishwise',
  entities: [User, Progress, AuthToken, Category, Lesson, Quiz, QuizAttempt, Scan],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: ['error', 'warn'],
});
