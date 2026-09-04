import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToOne,
  JoinColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/user.entity';

/**
 * One row per user. Mirrors the gamification state the frontend store
 * used to keep in localStorage, but the server is now the source of truth.
 *
 *  - completedLessons / bookmarks / badges : string[] of ids (jsonb)
 *  - dailyChallenge : { [isoDate]: { correct: boolean } }  (jsonb)
 */
@Entity('progress')
export class Progress {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @OneToOne(() => User, (u) => u.progress, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({ name: 'user_id' })
  userId: string;

  @Column({ type: 'int', default: 0 })
  xp: number;

  @Column({ name: 'completed_lessons', type: 'jsonb', default: () => "'[]'" })
  completedLessons: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  bookmarks: string[];

  @Column({ type: 'jsonb', default: () => "'[]'" })
  badges: string[];

  @Column({ type: 'int', default: 0 })
  streak: number;

  @Column({ name: 'last_active_date', type: 'date', nullable: true })
  lastActiveDate: string | null;

  @Column({ name: 'daily_challenge', type: 'jsonb', default: () => "'{}'" })
  dailyChallenge: Record<string, { correct: boolean }>;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
