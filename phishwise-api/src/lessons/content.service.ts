import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category, Lesson, Quiz } from './content.entities';
import { User } from '../users/user.entity';
import { Progress } from '../progress/progress.entity';
import { levelForXp } from '../gamification/gamification.engine';
import { todaysChallenge } from '../gamification/daily-challenges';
import { LEARNING_PATH } from './learning-path';

@Injectable()
export class ContentService {
  constructor(
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Lesson) private readonly lessons: Repository<Lesson>,
    @InjectRepository(Quiz) private readonly quizzes: Repository<Quiz>,
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Progress) private readonly progress: Repository<Progress>,
  ) {}

  getCategories() {
    return this.categories.find({ order: { sort: 'ASC' } });
  }

  getLearningPath() {
    return LEARNING_PATH;
  }

  async getLessons() {
    return this.lessons.find({
      where: { published: true },
      order: { sort: 'ASC' },
    });
  }

  async getLesson(id: string) {
    const lesson = await this.lessons.findOne({ where: { id } });
    if (!lesson) throw new NotFoundException('Lesson not found.');
    return lesson;
  }

  async getQuizzes() {
    return this.quizzes.find({
      where: { published: true },
      order: { sort: 'ASC' },
    });
  }

  async getQuiz(id: string) {
    const quiz = await this.quizzes.findOne({ where: { id } });
    if (!quiz) throw new NotFoundException('Quiz not found.');
    return quiz;
  }

  /** Today's challenge WITHOUT the answer (so the client can't cheat). */
  getDailyChallenge() {
    const ch = todaysChallenge();
    return {
      id: ch.id,
      title: ch.title,
      desc: ch.desc,
      options: ch.options,
      xp: ch.xp,
    };
  }

  /**
   * Leaderboard built from real users, blended with seeded demo users so the
   * board looks populated even early on. Sorted by XP desc, top 10.
   */
  async getLeaderboard(currentUserId?: string) {
    const rows = await this.progress.find({ relations: ['user'] });
    const real = rows
      .filter((r) => r.user)
      .map((r) => ({
        name: r.user.name,
        xp: r.xp,
        level: levelForXp(r.xp).level,
        streak: r.streak,
        badges: r.badges.length,
        isCurrentUser: r.user.id === currentUserId,
      }));
    return real
      .sort((a, b) => b.xp - a.xp)
      .slice(0, 10)
      .map((e, i) => ({ ...e, rank: i + 1 }));
  }
}
