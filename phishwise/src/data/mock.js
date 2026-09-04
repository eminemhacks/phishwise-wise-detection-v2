export const LEVELS = [
  { level: 1, name: "Recruit", minXp: 0 },
  { level: 2, name: "Spotter", minXp: 200 },
  { level: 3, name: "Analyst", minXp: 500 },
  { level: 4, name: "Defender", minXp: 900 },
  { level: 5, name: "Guardian", minXp: 1400 },
  { level: 6, name: "Sentinel", minXp: 2000 },
  { level: 7, name: "Cyber Sage", minXp: 2800 },
];

export function levelForXp(xp) {
  let current = LEVELS[0];
  for (const l of LEVELS) if (xp >= l.minXp) current = l;
  const next = LEVELS.find((l) => l.minXp > xp) || null;
  const floor = current.minXp;
  const ceil = next ? next.minXp : floor + 1;
  const pct = next ? Math.min(100, Math.round(((xp - floor) / (ceil - floor)) * 100)) : 100;
  return { ...current, next, pct, toNext: next ? next.minXp - xp : 0 };
}

export const BADGES = [
  { id: "first-steps", name: "First Steps", icon: "Footprints", tier: "bronze", desc: "Complete your first lesson." },
  { id: "quiz-rookie", name: "Quiz Rookie", icon: "ClipboardCheck", tier: "bronze", desc: "Finish your first quiz." },
  { id: "sharp-eye", name: "Sharp Eye", icon: "Eye", tier: "silver", desc: "Score 80% or higher on any quiz." },
  { id: "perfectionist", name: "Perfectionist", icon: "Target", tier: "gold", desc: "Score 100% on any quiz." },
  { id: "bookworm", name: "Bookworm", icon: "BookOpen", tier: "silver", desc: "Complete 5 lessons." },
  { id: "scholar", name: "Security Scholar", icon: "GraduationCap", tier: "gold", desc: "Complete 10 lessons." },
  { id: "streak-3", name: "On Fire", icon: "Flame", tier: "bronze", desc: "Reach a 3-day learning streak." },
  { id: "streak-7", name: "Unstoppable", icon: "Zap", tier: "gold", desc: "Reach a 7-day learning streak." },
  { id: "phish-hunter", name: "Phish Hunter", icon: "Fish", tier: "silver", desc: "Complete all Phishing Awareness lessons." },
  { id: "challenger", name: "Daily Challenger", icon: "Swords", tier: "bronze", desc: "Complete a daily challenge." },
  { id: "level-3", name: "Rising Analyst", icon: "TrendingUp", tier: "silver", desc: "Reach Level 3." },
  { id: "collector", name: "Badge Collector", icon: "Award", tier: "gold", desc: "Unlock 6 other badges." },
  // Detection badges (detection-first pivot)
  { id: "first-catch", name: "First Catch", icon: "ScanSearch", tier: "bronze", desc: "Run your first phishing scan." },
  { id: "sharp-detector", name: "Sharp Detector", icon: "Radar", tier: "silver", desc: "Run 10 scans with the detector." },
  { id: "scan-veteran", name: "Scan Veteran", icon: "ShieldAlert", tier: "silver", desc: "Run 25 scans with the detector." },
  { id: "threat-hunter", name: "Threat Hunter", icon: "Crosshair", tier: "gold", desc: "Catch 5 threats (Likely Phishing or Dangerous)." },
];

export const LEADERBOARD = [
  { name: "Chiamaka O.", xp: 2640, level: 6, streak: 14, badges: 11 },
  { name: "Tunde A.", xp: 2310, level: 6, streak: 9, badges: 10 },
  { name: "Fatima B.", xp: 1980, level: 5, streak: 21, badges: 9 },
  { name: "Emeka N.", xp: 1720, level: 5, streak: 5, badges: 8 },
  { name: "Aisha M.", xp: 1450, level: 5, streak: 12, badges: 8 },
  { name: "Segun J.", xp: 1180, level: 4, streak: 3, badges: 6 },
  { name: "Grace I.", xp: 940, level: 4, streak: 7, badges: 6 },
  { name: "David K.", xp: 720, level: 3, streak: 2, badges: 4 },
  { name: "Hauwa S.", xp: 510, level: 3, streak: 4, badges: 3 },
  { name: "Kelechi U.", xp: 330, level: 2, streak: 1, badges: 2 },
];

export const DAILY_CHALLENGES = [
  {
    id: "dc-1",
    title: "Spot the Phish",
    desc: "An email from 'apple.support@icloud-verify.net' asks you to confirm your Apple ID. Is the sender domain legitimate?",
    options: ["Yes — it mentions iCloud", "No — the registered domain is icloud-verify.net, not apple.com"],
    answer: 1,
    xp: 30,
  },
  {
    id: "dc-2",
    title: "Password Showdown",
    desc: "Which would take longer to crack: 'Tr0ub4dor!' or 'correct-horse-battery-staple'?",
    options: ["Tr0ub4dor! — it has symbols", "correct-horse-battery-staple — length beats complexity"],
    answer: 1,
    xp: 30,
  },
  {
    id: "dc-3",
    title: "OTP Trap",
    desc: "A caller from 'your bank' asks you to read out the code just texted to you, to 'cancel a fraudulent transfer'. Do you read it?",
    options: ["Yes — it cancels the fraud", "Never — reading out an OTP authorises the attacker's transaction"],
    answer: 1,
    xp: 30,
  },
];

export function todaysChallenge() {
  const day = Math.floor(Date.now() / 86400000);
  return DAILY_CHALLENGES[day % DAILY_CHALLENGES.length];
}

export const NOTIFICATIONS = [
  { id: 1, icon: "Flame", title: "Streak reminder", body: "Complete one lesson today to keep your streak alive.", time: "2h ago", unread: true },
  { id: 2, icon: "Award", title: "New badge available", body: "Score 100% on any quiz to unlock Perfectionist.", time: "6h ago", unread: true },
  { id: 3, icon: "BookOpen", title: "New lesson published", body: "\"Clicked a Bad Link? Do This Now\" was added to Cyber Hygiene.", time: "1d ago", unread: false },
  { id: 4, icon: "TrendingUp", title: "Weekly recap ready", body: "You earned 180 XP last week — view your report.", time: "2d ago", unread: false },
];

export const ADMIN_NOTIFICATIONS = [
  { id: 1, icon: "UserPlus", title: "12 new sign-ups", body: "12 learners registered in the last 7 days.", time: "1h ago", unread: true },
  { id: 2, icon: "AlertTriangle", title: "Low quiz pass rate", body: "Social Engineering Defense pass rate dropped to 58%.", time: "5h ago", unread: true },
  { id: 3, icon: "FileCheck", title: "Content review due", body: "2 lessons are awaiting review before publishing.", time: "1d ago", unread: false },
  { id: 4, icon: "BarChart3", title: "Monthly report generated", body: "May engagement report is ready to export.", time: "3d ago", unread: false },
];

export const ADMIN_USERS = [
  { id: 1, name: "Chiamaka Obi", email: "chiamaka@unilag.edu.ng", role: "Learner", status: "Active", lessons: 16, quizzes: 6, avgScore: 92, completion: 100, lastActive: "Today" },
  { id: 2, name: "Tunde Adeyemi", email: "tunde.a@gmail.com", role: "Learner", status: "Active", lessons: 14, quizzes: 6, avgScore: 88, completion: 88, lastActive: "Today" },
  { id: 3, name: "Fatima Bello", email: "fatima.b@yahoo.com", role: "Learner", status: "Active", lessons: 13, quizzes: 5, avgScore: 85, completion: 81, lastActive: "Yesterday" },
  { id: 4, name: "Emeka Nwosu", email: "emeka.n@outlook.com", role: "Learner", status: "Active", lessons: 11, quizzes: 5, avgScore: 79, completion: 69, lastActive: "Yesterday" },
  { id: 5, name: "Aisha Mohammed", email: "aisha.m@gmail.com", role: "Moderator", status: "Active", lessons: 10, quizzes: 4, avgScore: 83, completion: 63, lastActive: "2 days ago" },
  { id: 6, name: "Segun Joseph", email: "segun.j@gmail.com", role: "Learner", status: "Active", lessons: 8, quizzes: 4, avgScore: 74, completion: 50, lastActive: "3 days ago" },
  { id: 7, name: "Grace Innocent", email: "grace.i@gmail.com", role: "Learner", status: "Inactive", lessons: 6, quizzes: 3, avgScore: 81, completion: 38, lastActive: "2 weeks ago" },
  { id: 8, name: "David Kalu", email: "david.k@gmail.com", role: "Learner", status: "Active", lessons: 5, quizzes: 2, avgScore: 66, completion: 31, lastActive: "4 days ago" },
  { id: 9, name: "Hauwa Sani", email: "hauwa.s@gmail.com", role: "Learner", status: "Suspended", lessons: 4, quizzes: 2, avgScore: 58, completion: 25, lastActive: "1 month ago" },
  { id: 10, name: "Kelechi Umeh", email: "kelechi.u@gmail.com", role: "Learner", status: "Active", lessons: 3, quizzes: 1, avgScore: 71, completion: 19, lastActive: "Today" },
  { id: 11, name: "Usman Alabura", email: "admin@phishwise.demo", role: "Admin", status: "Active", lessons: 16, quizzes: 6, avgScore: 95, completion: 100, lastActive: "Now" },
  { id: 12, name: "Blessing Eze", email: "blessing.e@gmail.com", role: "Learner", status: "Inactive", lessons: 2, quizzes: 0, avgScore: 0, completion: 13, lastActive: "3 weeks ago" },
];

export const ENGAGEMENT_SERIES = [
  { week: "W1", activeUsers: 42, lessons: 96, quizzes: 38 },
  { week: "W2", activeUsers: 55, lessons: 128, quizzes: 51 },
  { week: "W3", activeUsers: 61, lessons: 142, quizzes: 60 },
  { week: "W4", activeUsers: 58, lessons: 130, quizzes: 57 },
  { week: "W5", activeUsers: 70, lessons: 168, quizzes: 73 },
  { week: "W6", activeUsers: 84, lessons: 201, quizzes: 89 },
  { week: "W7", activeUsers: 91, lessons: 226, quizzes: 98 },
  { week: "W8", activeUsers: 103, lessons: 251, quizzes: 112 },
];

export const QUIZ_STATS = [
  { name: "Phishing Fundamentals", attempts: 142, passRate: 86, avgScore: 84 },
  { name: "URL Detective", attempts: 117, passRate: 71, avgScore: 76 },
  { name: "Password & Accounts", attempts: 108, passRate: 89, avgScore: 87 },
  { name: "Social Eng. Defense", attempts: 76, passRate: 58, avgScore: 67 },
  { name: "Mobile & Messaging", attempts: 91, passRate: 78, avgScore: 80 },
  { name: "Cyber Hygiene", attempts: 99, passRate: 91, avgScore: 88 },
];

export const CATEGORY_COMPLETION = [
  { name: "Phishing", value: 28 },
  { name: "Email", value: 16 },
  { name: "Passwords", value: 18 },
  { name: "Social Eng.", value: 12 },
  { name: "Browsing", value: 9 },
  { name: "Mobile", value: 8 },
  { name: "Soc. Media", value: 5 },
  { name: "Hygiene", value: 4 },
];

export const BADGE_DISTRIBUTION = [
  { name: "First Steps", count: 118 },
  { name: "Quiz Rookie", count: 104 },
  { name: "Sharp Eye", count: 77 },
  { name: "Bookworm", count: 63 },
  { name: "On Fire", count: 51 },
  { name: "Perfectionist", count: 29 },
  { name: "Unstoppable", count: 17 },
];

export const FAQS = [
  { q: "What is PhishWise?", a: "PhishWise is a gamified micro-learning platform that teaches phishing awareness and cyber hygiene through short lessons, scenario-based quizzes, XP, badges, and streaks. Lessons take 4–6 minutes, so you can build security habits a few minutes at a time." },
  { q: "How do I earn XP and level up?", a: "You earn XP by completing lessons (50–80 XP each), passing quizzes (up to 100 XP based on score), and finishing the daily challenge (30 XP). As your XP grows you progress through seven levels, from Recruit to Cyber Sage." },
  { q: "What happens if I miss a day — do I lose my streak?", a: "Your streak counts consecutive days with at least one completed lesson, quiz, or daily challenge. Missing a full day resets the streak to zero, but your XP, levels, and badges are never lost." },
  { q: "Can I retake a quiz?", a: "Yes — every quiz can be retaken as many times as you like. Your quiz history keeps each attempt so you can watch your scores improve. Badges are awarded based on your best performance." },
  { q: "How are badges unlocked?", a: "Each badge has a clear condition — for example, Sharp Eye unlocks at 80%+ on any quiz, and Unstoppable unlocks at a 7-day streak. Open the Achievements page to see every badge and its requirement." },
  { q: "Is my progress saved?", a: "In this demo, your session and progress are stored locally in your browser (localStorage). Clearing your browser data resets the demo. A production deployment would sync progress to a secure backend." },
  { q: "What's the difference between the learner and admin views?", a: "Learners see lessons, quizzes, achievements, and personal analytics. Admins additionally manage content and users, and view platform-wide reports such as engagement trends, quiz pass rates, and badge distribution." },
  { q: "Who is PhishWise for?", a: "Students, employees, and everyday internet users — anyone who wants practical defenses against phishing, social engineering, and account takeover, without sitting through hour-long training videos." },
];
