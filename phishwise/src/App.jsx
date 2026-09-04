import { BrowserRouter, Routes, Route, Navigate, Outlet, Link, useLocation } from "react-router-dom";
import { AppProvider, useApp } from "./lib/store.jsx";
import { AppShell } from "./components/layout.jsx";
import { Toasts, BadgeUnlockModal, Button, Icon } from "./components/ui.jsx";

import Landing from "./pages/Landing.jsx";
import { Login, Register, ForgotPassword, Onboarding, VerifyEmail, ResetPassword } from "./pages/Auth.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Detector, { ScanHistory } from "./pages/Detector.jsx";
import { LessonLibrary, LessonDetail } from "./pages/Lessons.jsx";
import { QuizList, QuizPlayer } from "./pages/Quizzes.jsx";
import Achievements from "./pages/Achievements.jsx";
import Reports from "./pages/Reports.jsx";
import Profile from "./pages/Profile.jsx";
import Help from "./pages/Help.jsx";
import { AdminOverview, AdminContent, AdminUsers, AdminAnalytics } from "./pages/Admin.jsx";

/* ---- guards ---- */
function BootSplash() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 dark:bg-ink-900">
      <div className="flex flex-col items-center gap-3 text-ink-400">
        <Icon name="Loader2" size={28} className="animate-spin text-signal-600" />
        <p className="text-sm">Loading PhishWise…</p>
      </div>
    </div>
  );
}

function RequireAuth() {
  const { user, booting } = useApp();
  const location = useLocation();
  if (booting) return <BootSplash />;
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

function RequireAdmin() {
  const { user, booting } = useApp();
  if (booting) return <BootSplash />;
  if (user?.role !== "admin") return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

function RequireLearner() {
  const { user, booting } = useApp();
  if (booting) return <BootSplash />;
  if (user?.role === "admin") return <Navigate to="/admin/content" replace />;
  return <Outlet />;
}

function NotFound() {
  const { user } = useApp();
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-ink-50 px-6 text-center dark:bg-ink-900">
      <span className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-signal-50 dark:bg-signal-900/30">
        <Icon name="Compass" size={30} className="text-signal-600 dark:text-signal-400" />
      </span>
      <h1 className="font-display text-3xl font-bold text-ink-900 dark:text-white">Page not found</h1>
      <p className="mt-2 max-w-sm text-sm text-ink-500 dark:text-ink-300">
        The page you're looking for doesn't exist — maybe a phisher moved it. Let's get you back on safe ground.
      </p>
      <Button as={Link} to={user ? "/dashboard" : "/"} variant="primary" className="mt-6">
        <Icon name="Home" size={16} /> {user ? "Back to dashboard" : "Back home"}
      </Button>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          {/* public */}
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/onboarding" element={<Onboarding />} />

          {/* authenticated app */}
          <Route element={<RequireAuth />}>
            {/* learner-only */}
            <Route element={<RequireLearner />}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/detector" element={<Detector />} />
              <Route path="/scan-history" element={<ScanHistory />} />
              <Route path="/lessons" element={<LessonLibrary />} />
              <Route path="/lessons/:id" element={<LessonDetail />} />
              <Route path="/quizzes" element={<QuizList />} />
              <Route path="/quizzes/:id" element={<QuizPlayer />} />
              <Route path="/achievements" element={<Achievements />} />
              <Route path="/reports" element={<Reports />} />
            </Route>
            <Route path="/profile" element={<Profile />} />
            <Route path="/help" element={<Help />} />

            {/* admin-only — 3 views only */}
            <Route element={<RequireAdmin />}>
              <Route path="/admin" element={<Navigate to="/admin/content" replace />} />
              <Route path="/admin/content" element={<AdminContent />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/analytics" element={<AdminAnalytics />} />
            </Route>
          </Route>

          <Route path="*" element={<NotFound />} />
        </Routes>
        <Toasts />
        <BadgeUnlockModal />
      </BrowserRouter>
    </AppProvider>
  );
}
