import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { AppDataSource } from '../data-source';
import { User, UserRole, UserStatus } from '../../users/user.entity';
import { Progress } from '../../progress/progress.entity';
import { Category, Lesson, Quiz } from '../../lessons/content.entities';
import { CATEGORIES, LESSONS } from './lessons.data';
import { QUIZZES } from './quizzes.data';

async function run() {
  await AppDataSource.initialize();
  const qr = AppDataSource.createQueryRunner();
  console.log('🌱 Seeding PhishWise database...');

  // ── Categories ───────────────────────────────────────
  const catRepo = AppDataSource.getRepository(Category);
  for (let i = 0; i < CATEGORIES.length; i++) {
    const c = CATEGORIES[i];
    await catRepo.save(
      catRepo.create({
        id: c.id,
        name: c.name,
        icon: c.icon,
        color: c.color,
        bg: c.bg,
        sort: i,
      }),
    );
  }
  console.log(`  ✓ ${CATEGORIES.length} categories`);

  // ── Lessons ──────────────────────────────────────────
  const lessonRepo = AppDataSource.getRepository(Lesson);
  for (let i = 0; i < LESSONS.length; i++) {
    const l = LESSONS[i];
    await lessonRepo.save(
      lessonRepo.create({
        id: l.id,
        title: l.title,
        category: l.category,
        minutes: l.minutes,
        difficulty: l.difficulty,
        xp: l.xp,
        summary: l.summary,
        blocks: l.blocks,
        published: true,
        sort: i,
      }),
    );
  }
  console.log(`  ✓ ${LESSONS.length} lessons`);

  // ── Quizzes ──────────────────────────────────────────
  const quizRepo = AppDataSource.getRepository(Quiz);
  for (let i = 0; i < QUIZZES.length; i++) {
    const qz = QUIZZES[i] as any;
    await quizRepo.save(
      quizRepo.create({
        id: qz.id,
        title: qz.title,
        category: qz.category,
        difficulty: qz.difficulty,
        minutes: qz.minutes,
        timed: !!qz.timed,
        timeLimit: qz.timeLimit ?? null,
        description: qz.description,
        questions: qz.questions,
        published: true,
        sort: i,
      }),
    );
  }
  console.log(`  ✓ ${QUIZZES.length} quizzes`);

  // ── Demo users ───────────────────────────────────────
  const userRepo = AppDataSource.getRepository(User);
  const progressRepo = AppDataSource.getRepository(Progress);

  const demoUsers = [
    {
      email: 'admin@phishwise.demo',
      name: 'Usman Alabura',
      role: UserRole.ADMIN,
      password: 'demo-pass',
      xp: 2950,
      streak: 12,
      badges: ['first-steps', 'quiz-rookie', 'sharp-eye', 'perfectionist', 'bookworm', 'scholar', 'collector'],
    },
    {
      email: 'learner@phishwise.demo',
      name: 'Demo Learner',
      role: UserRole.LEARNER,
      password: 'demo-pass',
      xp: 540,
      streak: 3,
      badges: ['first-steps', 'quiz-rookie', 'streak-3'],
    },
    // A few extra learners so the leaderboard looks alive
    { email: 'chiamaka@unilag.edu.ng', name: 'Chiamaka Obi', role: UserRole.LEARNER, password: 'demo-pass', xp: 2640, streak: 14, badges: ['first-steps', 'bookworm', 'scholar', 'sharp-eye'] },
    { email: 'tunde.a@gmail.com', name: 'Tunde Adeyemi', role: UserRole.LEARNER, password: 'demo-pass', xp: 2310, streak: 9, badges: ['first-steps', 'bookworm', 'sharp-eye'] },
    { email: 'fatima.b@yahoo.com', name: 'Fatima Bello', role: UserRole.LEARNER, password: 'demo-pass', xp: 1980, streak: 21, badges: ['first-steps', 'streak-7', 'bookworm'] },
    { email: 'emeka.n@outlook.com', name: 'Emeka Nwosu', role: UserRole.LEARNER, password: 'demo-pass', xp: 1720, streak: 5, badges: ['first-steps', 'bookworm'] },
    { email: 'aisha.m@gmail.com', name: 'Aisha Mohammed', role: UserRole.MODERATOR, password: 'demo-pass', xp: 1450, streak: 12, badges: ['first-steps', 'sharp-eye'] },
  ];

  for (const d of demoUsers) {
    const user = await userRepo.save(
      userRepo.create({
        email: d.email,
        name: d.name,
        role: d.role,
        status: UserStatus.ACTIVE,
        emailVerified: true, // demo accounts are pre-verified
        passwordHash: await bcrypt.hash(d.password, 12),
        onboarded: true,
        lastActiveAt: new Date(),
      }),
    );
    await progressRepo.save(
      progressRepo.create({
        userId: user.id,
        xp: d.xp,
        streak: d.streak,
        badges: d.badges,
        completedLessons: [],
        bookmarks: [],
        dailyChallenge: {},
        lastActiveDate: new Date().toISOString().slice(0, 10),
      }),
    );
  }
  console.log(`  ✓ ${demoUsers.length} demo users (password: "demo-pass", pre-verified)`);

  await qr.release();
  await AppDataSource.destroy();
  console.log('✅ Seed complete.\n');
  console.log('   Demo logins (all pre-verified, password "demo-pass"):');
  console.log('     • admin@phishwise.demo   → admin');
  console.log('     • learner@phishwise.demo → learner');
}

run().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
