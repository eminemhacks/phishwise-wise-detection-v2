import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

/**
 * Community blocklist derived from user scans.
 * Only Threat verdicts (Likely Phishing / Dangerous) are added.
 * Registrable domain is the dedup key — we don't store every URL variant.
 */
@Entity('reported_phishing_urls')
export class ReportedPhishingUrl {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'reg_domain', type: 'varchar' })
  regDomain: string;

  @Column({ name: 'example_url', type: 'text' })
  exampleUrl: string;

  @Column({ name: 'example_hash', type: 'varchar' })
  exampleHash: string;

  @Column({ name: 'first_verdict', type: 'varchar' })
  firstVerdict: string;

  @Column({ name: 'report_count', type: 'int', default: 1 })
  reportCount: number;

  @CreateDateColumn({ name: 'first_seen_at' })
  firstSeenAt: Date;

  @UpdateDateColumn({ name: 'last_reported_at' })
  lastReportedAt: Date;
}

/**
 * Message blocklist — hash of normalized message text.
 * Only Threat verdicts are added. Used to flag known phishing messages.
 */
@Entity('reported_phishing_messages')
export class ReportedPhishingMessage {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Index({ unique: true })
  @Column({ name: 'msg_hash', type: 'varchar' })
  msgHash: string;

  @Column({ name: 'preview', type: 'varchar', length: 300 })
  preview: string;

  @Column({ name: 'first_verdict', type: 'varchar' })
  firstVerdict: string;

  @Column({ name: 'report_count', type: 'int', default: 1 })
  reportCount: number;

  @CreateDateColumn({ name: 'first_seen_at' })
  firstSeenAt: Date;

  @UpdateDateColumn({ name: 'last_reported_at' })
  lastReportedAt: Date;
}
