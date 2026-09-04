import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserStatus } from '../users/user.entity';
import { Progress } from '../progress/progress.entity';
import { Category, Lesson, Quiz } from '../lessons/content.entities';
import { QuizAttempt } from '../quizzes/quiz-attempt.entity';
import { BADGES, levelForXp } from '../gamification/gamification.engine';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Progress) private readonly progress: Repository<Progress>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Quiz) private readonly quizzes: Repository<Quiz>,
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
    @InjectRepository(QuizAttempt)
    private readonly attempts: Repository<QuizAttempt>,
  ) {}

  // ── User management ────────────────────────────────────
  async listUsers() {
    const rows = await this.users.find({
      relations: ['progress'],
      order: { createdAt: 'DESC' },
    });
    const totalLessons = await this.lessons.count({ where: { published: true } });
    return rows.map((u) => {
      const p = u.progress;
      const lessons = p?.completedLessons?.length ?? 0;
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        status: u.status,
        lessons,
        xp: p?.xp ?? 0,
        completion: totalLessons ? Math.round((lessons / totalLessons) * 100) : 0,
        lastActive: u.lastActiveAt ? u.lastActiveAt.toISOString() : null,
      };
    });
  }

  async setUserStatus(id: string, status: UserStatus) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found.');
    user.status = status;
    if (status === UserStatus.SUSPENDED) user.refreshTokenHash = null;
    await this.users.save(user);
    return { id: user.id, status: user.status };
  }

  // ── Content CRUD ───────────────────────────────────────
  async createLesson(data: Partial<Lesson>) {
    if (!data.id || !data.title) {
      throw new BadRequestException('Lesson id and title are required.');
    }
    const exists = await this.lessons.findOne({ where: { id: data.id } });
    if (exists) throw new BadRequestException('A lesson with that id exists.');
    return this.lessons.save(this.lessons.create(data));
  }

  async updateLesson(id: string, data: Partial<Lesson>) {
    const lesson = await this.lessons.findOne({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found.');
    Object.assign(lesson, data, { id });
    return this.lessons.save(lesson);
  }

  async deleteLesson(id: string) {
    const res = await this.lessons.delete({ id });
    if (!res.affected) throw new NotFoundException('Lesson not found.');
    return { id, deleted: true };
  }

  async createQuiz(data: Partial<Quiz>) {
    if (!data.id || !data.title) {
      throw new BadRequestException('Quiz id and title are required.');
    }
    const exists = await this.quizzes.findOne({ where: { id: data.id } });
    if (exists) throw new BadRequestException('A quiz with that id exists.');
    return this.quizzes.save(this.quizzes.create(data));
  }

  async updateQuiz(id: string, data: Partial<Quiz>) {
    const quiz = await this.quizzes.findOne({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found.');
    Object.assign(quiz, data, { id });
    return this.quizzes.save(quiz);
  }

  async deleteQuiz(id: string) {
    const res = await this.quizzes.delete({ id });
    if (!res.affected) throw new NotFoundException('Quiz not found.');
    return { id, deleted: true };
  }

  // ── Analytics ──────────────────────────────────────────
  async overview() {
    const [userCount, lessonCount, quizCount, attempts, progresses] =
      await Promise.all([
        this.users.count(),
        this.lessons.count({ where: { published: true } }),
        this.quizzes.count({ where: { published: true } }),
        this.attempts.find(),
        this.progress.find(),
      ]);

    const activeUsers = await this.users.count({
      where: { status: UserStatus.ACTIVE },
    });
    const totalXp = progresses.reduce((s, p) => s + p.xp, 0);
    const avgQuizScore = attempts.length
      ? Math.round(attempts.reduce((s, a) => s + a.pct, 0) / attempts.length)
      : 0;
    const lessonsCompleted = progresses.reduce(
      (s, p) => s + (p.completedLessons?.length ?? 0),
      0,
    );

    return {
      users: userCount,
      activeUsers,
      lessons: lessonCount,
      quizzes: quizCount,
      quizAttempts: attempts.length,
      lessonsCompleted,
      avgQuizScore,
      totalXp,
    };
  }

  /** Quiz pass-rate + average score grouped by quiz. */
  async quizStats() {
    const attempts = await this.attempts.find();
    const byQuiz = new Map<string, { title: string; pcts: number[] }>();
    for (const a of attempts) {
      if (!byQuiz.has(a.quizId))
        byQuiz.set(a.quizId, { title: a.title, pcts: [] });
      byQuiz.get(a.quizId)!.pcts.push(a.pct);
    }
    return [...byQuiz.values()].map((g) => ({
      name: g.title,
      attempts: g.pcts.length,
      passRate: Math.round(
        (g.pcts.filter((p) => p >= 70).length / g.pcts.length) * 100,
      ),
      avgScore: Math.round(g.pcts.reduce((s, p) => s + p, 0) / g.pcts.length),
    }));
  }

  /** Completed-lesson counts grouped by category. */
  async categoryCompletion() {
    const [lessons, progresses, categories] = await Promise.all([
      this.lessons.find(),
      this.progress.find(),
      this.categories.find({ order: { sort: 'ASC' } }),
    ]);
    const lessonCat = new Map(lessons.map((l) => [l.id, l.category]));
    const counts = new Map<string, number>();
    for (const p of progresses) {
      for (const id of p.completedLessons || []) {
        const cat = lessonCat.get(id);
        if (cat) counts.set(cat, (counts.get(cat) || 0) + 1);
      }
    }
    return categories.map((c) => ({
      name: c.name,
      value: counts.get(c.id) || 0,
    }));
  }

  /** How many users hold each badge. */
  async badgeDistribution() {
    const progresses = await this.progress.find();
    const counts = new Map<string, number>();
    for (const p of progresses) {
      for (const b of p.badges || []) {
        counts.set(b, (counts.get(b) || 0) + 1);
      }
    }
    return BADGES.map((b) => ({ name: b.name, count: counts.get(b.id) || 0 }))
      .filter((b) => b.count > 0)
      .sort((a, b) => b.count - a.count);
  }
}
