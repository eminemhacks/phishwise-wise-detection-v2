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
import { ScanResult } from './types';

/**
 * A saved scan. Rows are ONLY created for authenticated users \u2014 public "Try it"
 * scans on the landing page are analysed and returned but never persisted (see
 * DetectionService.scanPublic vs scanForUser).
 *
 * The full engine output is stored in `result` (jsonb) so the Scan History
 * detail view can re-render the exact itemised breakdown without re-running the
 * engine. `score`, `verdict` and `threat` are denormalised onto columns for
 * cheap aggregate queries in the admin analytics.
 */
@Entity('scans')
@Index(['userId', 'inputHash'], { unique: true })
export class Scan {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index()
  @ManyToOne(() => User, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ name: 'user_id', type: 'uuid', nullable: true })
  userId: string | null;

  @Column({ name: 'input_type', type: 'varchar' })
  inputType: 'url' | 'message';

  /** Raw input (URL or pasted message). */
  @Column({ type: 'text' })
  input: string;

  /** Normalized sha256 hash for dedup (prevents XP farming on same link/message). */
  @Index()
  @Column({ name: 'input_hash', type: 'varchar', nullable: true })
  inputHash: string | null;

  @Column({ type: 'int' })
  score: number;

  @Column({ type: 'varchar' })
  verdict: string;

  /** True when verdict is "Likely Phishing" or "Dangerous". */
  @Column({ type: 'boolean', default: false })
  threat: boolean;

  /** Full ScanResult payload for faithful re-rendering. */
  @Column({ type: 'jsonb', default: () => "'{}'" })
  result: ScanResult | Record<string, unknown>;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
