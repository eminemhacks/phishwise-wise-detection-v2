/**
 * Server-side gamification engine.
 *
 * This is the authoritative version of the logic that previously lived in the
 * frontend store (checkBadges / bumpStreak / levelForXp). The frontend now
 * trusts whatever the API returns instead of computing it locally.
 */

export interface LevelDef {
  level: number;
  name: string;
  minXp: number;
}

export const LEVELS: LevelDef[] = [
  { level: 1, name: 'Recruit', minXp: 0 },
  { level: 2, name: 'Spotter', minXp: 200 },
  { level: 3, name: 'Analyst', minXp: 500 },
  { level: 4, name: 'Defender', minXp: 900 },
  { level: 5, name: 'Guardian', minXp: 1400 },
  { level: 6, name: 'Sentinel', minXp: 2000 },
  { level: 7, name: 'Cyber Sage', minXp: 2800 },
];

export function levelForXp(xp: number) {
  let current = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.minXp) current = l;
  const next = LEVELS.find((l) => l.minXp > xp) || null;
  const floor = current.minXp;
  const ceil = next ? next.minXp : floor + 1;
  const pct = next
    ? Math.min(100, Math.round(((xp - floor) / (ceil - floor)) * 100))
    : 100;
  return { ...current, next, pct, toNext: next ? next.minXp - xp : 0 };
}

export interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  tier: 'bronze' | 'silver' | 'gold';
  desc: string;
}

export const BADGES: BadgeDef[] = [
  { id: 'first-steps', name: 'First Steps', icon: 'Footprints', tier: 'bronze', desc: 'Complete your first lesson.' },
  { id: 'quiz-rookie', name: 'Quiz Rookie', icon: 'ClipboardCheck', tier: 'bronze', desc: 'Finish your first quiz.' },
  { id: 'sharp-eye', name: 'Sharp Eye', icon: 'Eye', tier: 'silver', desc: 'Score 80% or higher on any quiz.' },
  { id: 'perfectionist', name: 'Perfectionist', icon: 'Target', tier: 'gold', desc: 'Score 100% on any quiz.' },
  { id: 'bookworm', name: 'Bookworm', icon: 'BookOpen', tier: 'silver', desc: 'Complete 5 lessons.' },
  { id: 'scholar', name: 'Security Scholar', icon: 'GraduationCap', tier: 'gold', desc: 'Complete 10 lessons.' },
  { id: 'streak-3', name: 'On Fire', icon: 'Flame', tier: 'bronze', desc: 'Reach a 3-day learning streak.' },
  { id: 'streak-7', name: 'Unstoppable', icon: 'Zap', tier: 'gold', desc: 'Reach a 7-day learning streak.' },
  { id: 'phish-hunter', name: 'Phish Hunter', icon: 'Fish', tier: 'silver', desc: 'Complete all Phishing Awareness lessons.' },
  { id: 'challenger', name: 'Daily Challenger', icon: 'Swords', tier: 'bronze', desc: 'Complete a daily challenge.' },
  { id: 'level-3', name: 'Rising Analyst', icon: 'TrendingUp', tier: 'silver', desc: 'Reach Level 3.' },
  { id: 'collector', name: 'Badge Collector', icon: 'Award', tier: 'gold', desc: 'Unlock 6 other badges.' },
  // ── Detection badges (added for the detection-first pivot) ─────────────
  { id: 'first-catch', name: 'First Catch', icon: 'ScanSearch', tier: 'bronze', desc: 'Run your first phishing scan.' },
  { id: 'sharp-detector', name: 'Sharp Detector', icon: 'Radar', tier: 'silver', desc: 'Run 10 scans with the detector.' },
  { id: 'scan-veteran', name: 'Scan Veteran', icon: 'ShieldAlert', tier: 'silver', desc: 'Run 25 scans with the detector.' },
  { id: 'threat-hunter', name: 'Threat Hunter', icon: 'Crosshair', tier: 'gold', desc: 'Catch 5 threats (Likely Phishing or Dangerous).' },
];

// XP awarded for using the detector (tuned low so scanning can't out-earn learning).
export const SCAN_XP = 8;
export const THREAT_CATCH_BONUS_XP = 7;

export interface ProgressLike {
  xp: number;
  completedLessons: string[];
  bookmarks: string[];
  quizHistory: { pct: number }[];
  badges: string[];
  streak: number;
  lastActiveDate: string | null;
  dailyChallenge: Record<string, { correct: boolean }>;
  // Detection dimension (optional; default 0 for pre-pivot callers).
  scanCount?: number;
  threatsCaught?: number;
}

/**
 * Recomputes the full badge set for a progress snapshot.
 * `phishingLessonIds` is injected so the engine stays decoupled from the DB.
 * Returns the new badge id list plus any newly-unlocked badge ids.
 */
export function evaluateBadges(
  p: ProgressLike,
  phishingLessonIds: string[],
): { badges: string[]; newlyUnlocked: string[] } {
  const unlocked = new Set(p.badges);
  const before = new Set(p.badges);
  const add = (id: string) => unlocked.add(id);

  if (p.completedLessons.length >= 1) add('first-steps');
  if (p.completedLessons.length >= 5) add('bookworm');
  if (p.completedLessons.length >= 10) add('scholar');
  if (p.quizHistory.length >= 1) add('quiz-rookie');
  if (p.quizHistory.some((q) => q.pct >= 80)) add('sharp-eye');
  if (p.quizHistory.some((q) => q.pct === 100)) add('perfectionist');
  if (p.streak >= 3) add('streak-3');
  if (p.streak >= 7) add('streak-7');
  if (Object.keys(p.dailyChallenge).length >= 1) add('challenger');
  if (
    phishingLessonIds.length > 0 &&
    phishingLessonIds.every((id) => p.completedLessons.includes(id))
  )
    add('phish-hunter');
  if (levelForXp(p.xp).level >= 3) add('level-3');

  // Detection badges (scanCount / threatsCaught default to 0 for old callers).
  const scanCount = p.scanCount ?? 0;
  const threatsCaught = p.threatsCaught ?? 0;
  if (scanCount >= 1) add('first-catch');
  if (scanCount >= 10) add('sharp-detector');
  if (scanCount >= 25) add('scan-veteran');
  if (threatsCaught >= 5) add('threat-hunter');

  // "collector" depends on having 6 OTHER badges, so evaluate last
  if (unlocked.size >= 7) add('collector');

  const newlyUnlocked = [...unlocked].filter((id) => !before.has(id));
  return { badges: [...unlocked], newlyUnlocked };
}

const todayStr = () => new Date().toISOString().slice(0, 10);

/**
 * Advances the streak based on lastActiveDate. Pure — returns the new
 * { streak, lastActiveDate } without mutating input.
 */
export function bumpStreak(p: {
  streak: number;
  lastActiveDate: string | null;
}): { streak: number; lastActiveDate: string } {
  const today = todayStr();
  if (p.lastActiveDate === today)
    return { streak: p.streak, lastActiveDate: today };
  const yesterday = new Date(Date.now() - 86400000)
    .toISOString()
    .slice(0, 10);
  const streak = p.lastActiveDate === yesterday ? p.streak + 1 : 1;
  return { streak, lastActiveDate: today };
}

export { todayStr };
