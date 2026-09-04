import {
  Entity,
  PrimaryColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('categories')
export class Category {
  @PrimaryColumn()
  id: string;

  @Column()
  name: string;

  @Column()
  icon: string;

  @Column()
  color: string;

  @Column()
  bg: string;

  @Column({ type: 'int', default: 0 })
  sort: number;
}

@Entity('lessons')
export class Lesson {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column({ name: 'category_id' })
  category: string;

  @Column({ type: 'int', default: 5 })
  minutes: number;

  @Column({ default: 'Easy' })
  difficulty: string;

  @Column({ type: 'int', default: 50 })
  xp: number;

  @Column({ type: 'text' })
  summary: string;

  // array of { type, heading, body?/items? } blocks
  @Column({ type: 'jsonb', default: () => "'[]'" })
  blocks: any[];

  @Column({ default: true })
  published: boolean;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

@Entity('quizzes')
export class Quiz {
  @PrimaryColumn()
  id: string;

  @Column()
  title: string;

  @Column({ name: 'category_id' })
  category: string;

  @Column({ default: 'Easy' })
  difficulty: string;

  @Column({ type: 'int', default: 5 })
  minutes: number;

  @Column({ default: false })
  timed: boolean;

  @Column({ name: 'time_limit', type: 'int', nullable: true })
  timeLimit: number | null;

  @Column({ type: 'text' })
  description: string;

  // array of { type, q, options[], answer, explanation }
  @Column({ type: 'jsonb', default: () => "'[]'" })
  questions: any[];

  @Column({ default: true })
  published: boolean;

  @Column({ type: 'int', default: 0 })
  sort: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
