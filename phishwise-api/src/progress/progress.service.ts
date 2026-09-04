import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Progress } from './progress.entity';
import { User } from '../users/user.entity';
import { Lesson, Quiz } from '../lessons/content.entities';
import { QuizAttempt } from '../quizzes/quiz-attempt.entity';
import {
  BADGES,
  bumpStreak,
  evaluateBadges,
  levelForXp,
  todayStr,
  SCAN_XP,
  THREAT_CATCH_BONUS_XP,
} from '../gamification/gamification.engine';
import { todaysChallenge } from '../gamification/daily-challenges';

@Injectable()
export class ProgressService {
  constructor(
    @InjectRepository(Progress) private readonly progress: Repository<Progress>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Quiz) private readonly quizzes: Repository<Quiz>,
    @InjectRepository(QuizAttempt)
    private readonly attempts: Repository<QuizAttempt>,
  ) {}

  private async getRow(userId: string): Promise<Progress> {
    let row = await this.progress.findOne({ where: { userId } });
    if (!row) {
      row = await this.progress.save(this.progress.create({ userId }));
    }
    return row;
  }

  private async phishingLessonIds(): Promise<string[]> {
    const rows = await this.lessons.find({ where: { category: 'phishing' } });
    return rows.map((l) => l.id);
  }

  /** Builds the full progress snapshot the frontend store expects. */
  async snapshot(userId: string) {
    const row = await this.getRow(userId);
    const history = await this.attempts.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
    const quizHistory = history.map((a) => ({
      quizId: a.quizId,
      title: a.title,
      score: a.score,
      total: a.total,
      pct: a.pct,
      xp: a.xp,
      timed: a.timed,
      date: a.createdAt.toISOString(),
    }));
    return {
      xp: row.xp,
      completedLessons: row.completedLessons,
      bookmarks: row.bookmarks,
      quizHistory,
      badges: row.badges,
      streak: row.streak,
      lastActiveDate: row.lastActiveDate,
      dailyChallenge: row.dailyChallenge,
      onboarded: (await this.users.findOne({ where: { id: userId } }))?.onboarded ?? false,
      level: levelForXp(row.xp),
    };
  }

  private async recomputeBadges(
    row: Progress,
    scanStats?: { scanCount?: number; threatsCaught?: number },
  ) {
    const history = await this.attempts.find({ where: { userId: row.userId } });
    const phishing = await this.phishingLessonIds();
    const { badges, newlyUnlocked } = evaluateBadges(
      {
        xp: row.xp,
        completedLessons: row.completedLessons,
        bookmarks: row.bookmarks,
        quizHistory: history.map((h) => ({ pct: h.pct })),
        badges: row.badges,
        streak: row.streak,
        lastActiveDate: row.lastActiveDate,
        dailyChallenge: row.dailyChallenge,
        scanCount: scanStats?.scanCount,
        threatsCaught: scanStats?.threatsCaught,
      },
      phishing,
    );
    row.badges = badges;
    return newlyUnlocked.map((id) => BADGES.find((b) => b.id === id)).filter(Boolean);
  }

  // ── Lessons ────────────────────────────────────────────
  async completeLesson(userId: string, lessonId: string) {
    const lesson = await this.lessons.findOne({ where: { id: lessonId } });
    if (!lesson) throw new NotFoundException('Lesson not found.');

    const row = await this.getRow(userId);
    let awardedXp = 0;
    if (!row.completedLessons.includes(lessonId)) {
      row.completedLessons = [...row.completedLessons, lessonId];
      awardedXp = lesson.xp ?? 50;
      row.xp += awardedXp;
      const s = bumpStreak(row);
      row.streak = s.streak;
      row.lastActiveDate = s.lastActiveDate;
    }
    const newBadges = await this.recomputeBadges(row);
    await this.progress.save(row);
    return {
      awardedXp,
      newBadges,
      progress: await this.snapshot(userId),
    };
  }

  async toggleBookmark(userId: string, lessonId: string) {
    const row = await this.getRow(userId);
    const has = row.bookmarks.includes(lessonId);
    row.bookmarks = has
      ? row.bookmarks.filter((b) => b !== lessonId)
      : [...row.bookmarks, lessonId];
    await this.progress.save(row);
    return { bookmarked: !has, bookmarks: row.bookmarks };
  }

  // ── Quizzes ────────────────────────────────────────────
  async recordQuiz(userId: string, quizId: string, score: number) {
    const quiz = await this.quizzes.findOne({ where: { id: quizId } });
    if (!quiz) throw new NotFoundException('Quiz not found.');
    const total = quiz.questions.length;
    if (score < 0 || score > total) {
      throw new BadRequestException('Score is out of range.');
    }
    const pct = Math.round((score / total) * 100);
    const xp = Math.round(pct);

    const row = await this.getRow(userId);
    row.xp += xp;
    const s = bumpStreak(row);
    row.streak = s.streak;
    row.lastActiveDate = s.lastActiveDate;

    await this.attempts.save(
      this.attempts.create({
        userId,
        quizId,
        title: quiz.title,
        score,
        total,
        pct,
        xp,
        timed: quiz.timed,
      }),
    );

    const newBadges = await this.recomputeBadges(row);
    await this.progress.save(row);
    return { pct, xp, newBadges, progress: await this.snapshot(userId) };
  }

  // ── Daily challenge ────────────────────────────────────
  async completeDailyChallenge(userId: string, correct: boolean) {
    const row = await this.getRow(userId);
    const today = todayStr();
    if (row.dailyChallenge[today]) {
      return { alreadyDone: true, progress: await this.snapshot(userId) };
    }
    const ch = todaysChallenge();
    row.dailyChallenge = { ...row.dailyChallenge, [today]: { correct } };
    let awardedXp = 0;
    if (correct) {
      awardedXp = ch.xp;
      row.xp += ch.xp;
    }
    const s = bumpStreak(row);
    row.streak = s.streak;
    row.lastActiveDate = s.lastActiveDate;
    const newBadges = await this.recomputeBadges(row);
    await this.progress.save(row);
    return { awardedXp, correct, newBadges, progress: await this.snapshot(userId) };
  }

  // ── Detection ──────────────────────────────────────────
  /**
   * Award XP + recompute badges after a scan. Called by DetectionService, which
   * supplies the user's up-to-date scan totals (computed from the scans table)
   * so the shared, server-authoritative badge engine can evaluate detection
   * badges without ProgressService needing to know about the Scan entity.
   */
  async applyScan(
    userId: string,
    opts: { isThreat: boolean; scanCount: number; threatsCaught: number },
  ) {
    const row = await this.getRow(userId);
    let awardedXp = SCAN_XP;
    row.xp += SCAN_XP;
    if (opts.isThreat) {
      awardedXp += THREAT_CATCH_BONUS_XP;
      row.xp += THREAT_CATCH_BONUS_XP;
    }
    const s = bumpStreak(row);
    row.streak = s.streak;
    row.lastActiveDate = s.lastActiveDate;
    const newBadges = await this.recomputeBadges(row, {
      scanCount: opts.scanCount,
      threatsCaught: opts.threatsCaught,
    });
    await this.progress.save(row);
    return { awardedXp, newBadges, progress: await this.snapshot(userId) };
  }

  // ── Reset ──────────────────────────────────────────────
  async reset(userId: string) {
    const row = await this.getRow(userId);
    row.xp = 0;
    row.completedLessons = [];
    row.bookmarks = [];
    row.badges = [];
    row.streak = 0;
    row.lastActiveDate = null;
    row.dailyChallenge = {};
    await this.progress.save(row);
    await this.attempts.delete({ userId });
    return this.snapshot(userId);
  }
}
