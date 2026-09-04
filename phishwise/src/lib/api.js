// Centralised API client for the PhishWise backend.
// Handles base URL, JWT storage, automatic refresh on 401, and JSON errors.

const BASE = import.meta.env.VITE_API_URL || "http://localhost:4000/api";

const ACCESS_KEY = "pw_access";
const REFRESH_KEY = "pw_refresh";

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set({ accessToken, refreshToken }) {
    if (accessToken) localStorage.setItem(ACCESS_KEY, accessToken);
    if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

export class ApiError extends Error {
  constructor(message, status, payload) {
    super(Array.isArray(message) ? message.join(" ") : message);
    this.status = status;
    this.payload = payload;
  }
}

let refreshing = null; // de-dupes concurrent refreshes

async function rawRequest(path, { method = "GET", body, auth = true, isRetry = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && tokenStore.access) {
    headers.Authorization = `Bearer ${tokenStore.access}`;
  }

  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (networkErr) {
    throw new ApiError(
      "Can't reach the PhishWise server. Is the API running?",
      0,
      null,
    );
  }

  // Attempt a silent refresh once on 401, then replay the request.
  if (res.status === 401 && auth && !isRetry && tokenStore.refresh) {
    const ok = await tryRefresh();
    if (ok) return rawRequest(path, { method, body, auth, isRetry: true });
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    const msg = data?.message || res.statusText || "Request failed";
    throw new ApiError(msg, res.status, data);
  }
  return data;
}

async function tryRefresh() {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    try {
      const res = await fetch(`${BASE}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: tokenStore.refresh }),
      });
      if (!res.ok) {
        tokenStore.clear();
        return false;
      }
      const data = await res.json();
      tokenStore.set(data);
      return true;
    } catch {
      tokenStore.clear();
      return false;
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

export const api = {
  get: (p, opts) => rawRequest(p, { ...opts, method: "GET" }),
  post: (p, body, opts) => rawRequest(p, { ...opts, method: "POST", body }),
  patch: (p, body, opts) => rawRequest(p, { ...opts, method: "PATCH", body }),
  delete: (p, opts) => rawRequest(p, { ...opts, method: "DELETE" }),
};

// ── Endpoint helpers ─────────────────────────────────────
export const authApi = {
  register: (data) => api.post("/auth/register", data, { auth: false }),
  login: (data) => api.post("/auth/login", data, { auth: false }),
  verifyEmail: (token) => api.post("/auth/verify-email", { token }, { auth: false }),
  resend: (email) => api.post("/auth/resend-verification", { email }, { auth: false }),
  forgot: (email) => api.post("/auth/forgot-password", { email }, { auth: false }),
  reset: (token, password) =>
    api.post("/auth/reset-password", { token, password }, { auth: false }),
  changePassword: (currentPassword, newPassword) =>
    api.post("/auth/change-password", { currentPassword, newPassword }),
  me: () => api.get("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

export const contentApi = {
  categories: () => api.get("/categories", { auth: false }),
  lessons: () => api.get("/lessons", { auth: false }),
  lesson: (id) => api.get(`/lessons/${id}`, { auth: false }),
  learningPath: () => api.get("/lessons/learning-path", { auth: false }),
  quizzes: () => api.get("/quizzes", { auth: false }),
  quiz: (id) => api.get(`/quizzes/${id}`, { auth: false }),
  dailyChallenge: () => api.get("/daily-challenge", { auth: false }),
  leaderboard: () => api.get("/leaderboard"),
};

export const progressApi = {
  get: () => api.get("/progress"),
  completeLesson: (id) => api.post(`/progress/lessons/${id}/complete`),
  bookmark: (id) => api.post(`/progress/lessons/${id}/bookmark`),
  recordQuiz: (quizId, score) => api.post("/progress/quizzes/record", { quizId, score }),
  dailyChallenge: (correct) => api.post("/progress/daily-challenge", { correct }),
  reset: () => api.post("/progress/reset"),
};

export const usersApi = {
  updateMe: (patch) => api.patch("/users/me", patch),
};

// ── Detection (phishing detector) ────────────────────────
export const detectionApi = {
  // Public "Try it" — no auth, never saved.
  scanPublic: (input, inputType) =>
    api.post("/detection/scan", { input, inputType }, { auth: false }),
  // Authenticated — saved to history + rewarded with XP/badges.
  scan: (input, inputType) => api.post("/detection/scans", { input, inputType }),
  history: () => api.get("/detection/scans"),
  getScan: (id) => api.get(`/detection/scans/${id}`),
  deleteScan: (id) => api.delete(`/detection/scans/${id}`),
  myStats: () => api.get("/detection/me/stats"),
  rules: () => api.get("/detection/rules", { auth: false }),
  adminStats: () => api.get("/detection/admin/stats"),
};

export const adminApi = {
  users: () => api.get("/admin/users"),
  setStatus: (id, status) => api.patch(`/admin/users/${id}/status`, { status }),
  createLesson: (data) => api.post("/admin/lessons", data),
  updateLesson: (id, data) => api.patch(`/admin/lessons/${id}`, data),
  deleteLesson: (id) => api.delete(`/admin/lessons/${id}`),
  createQuiz: (data) => api.post("/admin/quizzes", data),
  updateQuiz: (id, data) => api.patch(`/admin/quizzes/${id}`, data),
  deleteQuiz: (id) => api.delete(`/admin/quizzes/${id}`),
  overview: () => api.get("/admin/analytics/overview"),
  quizStats: () => api.get("/admin/analytics/quiz-stats"),
  categoryCompletion: () => api.get("/admin/analytics/category-completion"),
  badgeDistribution: () => api.get("/admin/analytics/badge-distribution"),
};
