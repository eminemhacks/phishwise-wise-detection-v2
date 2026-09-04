import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { User } from '../users/user.entity';

@Entity('quiz_attempts')
export class QuizAttempt {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, (u) => u.quizAttempts, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ name: 'quiz_id' })
  quizId: string;

  @Column()
  title: string;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'int' })
  total: number;

  @Column({ type: 'int' })
  pct: number;

  @Column({ type: 'int' })
  xp: number;

  @Column({ default: false })
  timed: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
