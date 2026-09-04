import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  useCallback,
  useRef,
} from "react";
import { BADGES, levelForXp } from "../data/mock";
import { authApi, progressApi, usersApi, detectionApi, tokenStore } from "./api";

const KEY_THEME = "pw_theme";

const defaultProgress = {
  xp: 0,
  completedLessons: [],
  bookmarks: [],
  quizHistory: [],
  badges: [],
  streak: 0,
  lastActiveDate: null,
  dailyChallenge: {},
  onboarded: false,
};

function loadTheme() {
  try {
    const raw = localStorage.getItem(KEY_THEME);
    return raw ? JSON.parse(raw) : "light";
  } catch {
    return "light";
  }
}

const AppCtx = createContext(null);

export function AppProvider({ children }) {
  const [user, setUser] = useState(null);
  const [progress, setProgress] = useState(defaultProgress);
  const [theme, setThemeState] = useState(loadTheme);
  const [toasts, setToasts] = useState([]);
  const [badgeModal, setBadgeModal] = useState(null);
  const [booting, setBooting] = useState(true);

  useEffect(() => {
    localStorage.setItem(KEY_THEME, JSON.stringify(theme));
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setTheme = useCallback(
    (t) => {
      setThemeState(t);
      if (user) usersApi.updateMe({ theme: t }).catch(() => {});
    },
    [user],
  );

  const toast = useCallback((title, body, kind = "success") => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, title, body, kind }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);
  const dismissToast = useCallback(
    (id) => setToasts((t) => t.filter((x) => x.id !== id)),
    [],
  );

  const applySnapshot = useCallback((snap) => {
    if (!snap) return;
    setProgress({
      xp: snap.xp ?? 0,
      completedLessons: snap.completedLessons ?? [],
      bookmarks: snap.bookmarks ?? [],
      quizHistory: snap.quizHistory ?? [],
      badges: snap.badges ?? [],
      streak: snap.streak ?? 0,
      lastActiveDate: snap.lastActiveDate ?? null,
      dailyChallenge: snap.dailyChallenge ?? {},
      onboarded: snap.onboarded ?? false,
    });
  }, []);

  const showNewBadges = useCallback((newBadges) => {
    if (newBadges && newBadges.length) setBadgeModal(newBadges[0]);
  }, []);

  const bootstrapped = useRef(false);
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    (async () => {
      if (!tokenStore.access && !tokenStore.refresh) {
        setBooting(false);
        return;
      }
      try {
        const me = await authApi.me();
        setUser(me);
        if (me.theme) setThemeState(me.theme);
        const snap = await progressApi.get();
        applySnapshot(snap);
      } catch {
        tokenStore.clear();
        setUser(null);
      } finally {
        setBooting(false);
      }
    })();
  }, [applySnapshot]);

  const login = useCallback(
    async (email, password) => {
      const data = await authApi.login({ email, password });
      tokenStore.set(data);
      setUser(data.user);
      if (data.user.theme) setThemeState(data.user.theme);
      const snap = await progressApi.get();
      applySnapshot(snap);
      return data.user;
    },
    [applySnapshot],
  );

  const register = useCallback(async (email, name, password) => {
    return authApi.register({ email, name, password });
  }, []);

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      /* ignore */
    }
    tokenStore.clear();
    setUser(null);
    setProgress(defaultProgress);
  }, []);

  const updateUser = useCallback(async (patch) => {
    const allowed = {};
    if (patch.name !== undefined) allowed.name = patch.name;
    if (patch.avatarUrl !== undefined) allowed.avatarUrl = patch.avatarUrl;
    if (patch.theme !== undefined) allowed.theme = patch.theme;
    if (patch.onboarded !== undefined) allowed.onboarded = patch.onboarded;
    setUser((u) => (u ? { ...u, ...patch } : u));
    try {
      const updated = await usersApi.updateMe(allowed);
      setUser((u) => ({ ...u, ...updated }));
    } catch {
      /* keep optimistic value */
    }
  }, []);

  const completeLesson = useCallback(
    async (lessonId) => {
      if (progress.completedLessons.includes(lessonId)) return;
      try {
        const res = await progressApi.completeLesson(lessonId);
        applySnapshot(res.progress);
        if (res.awardedXp > 0)
          toast("Lesson completed", `+${res.awardedXp} XP earned`, "xp");
        showNewBadges(res.newBadges);
      } catch (e) {
        toast("Couldn't save progress", e.message, "info");
      }
    },
    [progress.completedLessons, applySnapshot, toast, showNewBadges],
  );

  const toggleBookmark = useCallback(
    async (lessonId) => {
      const has = progress.bookmarks.includes(lessonId);
      setProgress((p) => ({
        ...p,
        bookmarks: has
          ? p.bookmarks.filter((b) => b !== lessonId)
          : [...p.bookmarks, lessonId],
      }));
      toast(
        has ? "Bookmark removed" : "Lesson saved",
        has ? "Removed from your saved lessons." : "Added to your saved lessons.",
        "info",
      );
      try {
        const res = await progressApi.bookmark(lessonId);
        setProgress((p) => ({ ...p, bookmarks: res.bookmarks }));
      } catch {
        setProgress((p) => ({
          ...p,
          bookmarks: has
            ? [...p.bookmarks, lessonId]
            : p.bookmarks.filter((b) => b !== lessonId),
        }));
      }
    },
    [progress.bookmarks, toast],
  );

  const recordQuiz = useCallback(
    async (quiz, score) => {
      const total = quiz.questions.length;
      const pct = Math.round((score / total) * 100);
      const xp = Math.round(pct);
      try {
        const res = await progressApi.recordQuiz(quiz.id, score);
        applySnapshot(res.progress);
        toast(
          "Quiz submitted",
          `You scored ${res.pct}% and earned +${res.xp} XP`,
          "xp",
        );
        showNewBadges(res.newBadges);
        return { pct: res.pct, xp: res.xp };
      } catch (e) {
        toast("Couldn't save quiz", e.message, "info");
        return { pct, xp };
      }
    },
    [applySnapshot, toast, showNewBadges],
  );

  const completeDailyChallenge = useCallback(
    async (correct) => {
      try {
        const res = await progressApi.dailyChallenge(correct);
        applySnapshot(res.progress);
        if (res.alreadyDone) return;
        if (correct)
          toast(
            "Daily challenge complete",
            `+${res.awardedXp} XP — see you tomorrow!`,
            "xp",
          );
        else
          toast(
            "Challenge answered",
            "Not quite — read the explanation and come back tomorrow.",
            "info",
          );
        showNewBadges(res.newBadges);
      } catch (e) {
        toast("Couldn't save challenge", e.message, "info");
      }
    },
    [applySnapshot, toast, showNewBadges],
  );

  const runScan = useCallback(
    async (input, inputType) => {
      // Authenticated scan: saved to history and rewarded server-side.
      // Dedup: 0 XP if same normalized input was scanned before.
      try {
        const res = await detectionApi.scan(input, inputType);
        if (res.isDuplicate) {
          toast("Already scanned", res.message || "No extra XP — see your previous result.", "info");
          // don't update progress (no XP), but still return the scan
          return { ...res.scan, isDuplicate: true };
        }
        if (res.progress) applySnapshot(res.progress);
        if (res.awardedXp > 0)
          toast("Scan saved", `+${res.awardedXp} XP earned`, "xp");
        showNewBadges(res.newBadges);
        return { ...res.scan, isDuplicate: false };
      } catch (e) {
        if (e.status === 429) {
          toast("Slow down", e.message || "Too many scans — wait a minute.", "info");
        }
        throw e;
      }
    },
    [applySnapshot, toast, showNewBadges],
  );

  const setOnboarded = useCallback(() => {
    setProgress((p) => ({ ...p, onboarded: true }));
    usersApi.updateMe({ onboarded: true }).catch(() => {});
  }, []);

  const resetProgress = useCallback(async () => {
    try {
      const snap = await progressApi.reset();
      applySnapshot(snap);
      toast("Progress reset", "All your learning progress has been cleared.", "info");
    } catch (e) {
      toast("Couldn't reset", e.message, "info");
    }
  }, [applySnapshot, toast]);

  const value = useMemo(
    () => ({
      user,
      booting,
      login,
      register,
      logout,
      updateUser,
      progress,
      completeLesson,
      toggleBookmark,
      recordQuiz,
      completeDailyChallenge,
      runScan,
      setOnboarded,
      resetProgress,
      theme,
      setTheme,
      toasts,
      toast,
      dismissToast,
      badgeModal,
      setBadgeModal,
      level: levelForXp(progress.xp),
    }),
    [
      user, booting, login, register, logout, updateUser, progress,
      completeLesson, toggleBookmark, recordQuiz, completeDailyChallenge,
      setOnboarded, resetProgress, theme, setTheme, toasts, toast,
      dismissToast, badgeModal, runScan,
    ],
  );

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>;
}

export function useApp() {
  const ctx = useContext(AppCtx);
  if (!ctx) throw new Error("useApp must be used inside AppProvider");
  return ctx;
}
