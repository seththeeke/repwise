import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { getCurrentUser, signOut as amplifySignOut } from 'aws-amplify/auth';
import { isCognitoConfigured } from './lib/amplify';
import { Navigate } from 'react-router-dom';
import LandingPage from './pages/LandingPage';
import { DashboardPage } from './features/dashboard/DashboardPage';
import { ProfilePage } from './features/profile/ProfilePage';
import { SettingsPage } from './features/profile/SettingsPage';
import { GoalsPage } from './features/goals/GoalsPage';
import { FeedPage } from './features/feed/FeedPage';
import { NewWorkoutScreen } from './features/workoutBuilder/NewWorkoutScreen';
import { AIWorkoutScreen } from './features/workoutBuilder/AIWorkoutScreen';
import { SelectExercisesScreen } from './features/workoutBuilder/SelectExercisesScreen';
import { ReviewWorkoutScreen } from './features/workoutBuilder/ReviewWorkoutScreen';
import { WorkoutExecutionPage } from './features/workoutExecution/WorkoutExecutionPage';
import { ExerciseCatalogPage } from './features/exerciseCatalog/ExerciseCatalogPage';
import { ExerciseMetricsPage } from './features/metrics/ExerciseMetricsPage';
import { ExerciseMetricsDetailPage } from './features/metrics/ExerciseMetricsDetailPage';
import { WorkoutDetailPage } from './features/workout/WorkoutDetailPage';
import { WorkoutsHistoryPage } from './features/workout/WorkoutsHistoryPage';
import { OnboardingFlow } from './features/onboarding/OnboardingFlow';
import LoginDialog from './components/LoginDialog';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ui/Toast';
import { usersApi } from './api/users';
import { useAuthStore } from './stores/authStore';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import { Dumbbell } from 'lucide-react';
import { AdminHomePage } from './features/admin/AdminHomePage';
import { BuilderAiConfigPage } from './features/admin/BuilderAiConfigPage';

function NativeLoginRedirect() {
  const navigate = useNavigate();
  const location = useLocation();
  useEffect(() => {
    if (
      Capacitor.getPlatform() !== 'web' &&
      sessionStorage.getItem('repwise_native_login_redirect') === '1'
    ) {
      sessionStorage.removeItem('repwise_native_login_redirect');
      navigate('/dashboard', { replace: true });
    }
  }, [navigate, location.pathname]);
  return null;
}

function AppShell({ children }: { children: ReactNode }) {
  const isOnline = useOnlineStatus();
  return (
    <ErrorBoundary>
      {!isOnline && (
        <div className="sticky top-0 z-50 px-4 py-2 bg-amber-500 text-amber-950 text-center text-sm font-medium">
          You're offline. Some features may not work.
        </div>
      )}
      {children}
    </ErrorBoundary>
  );
}

function ConfigRequired() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900">
      <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
        Auth User Pool not configured
      </h1>
      <p className="text-gray-600 dark:text-gray-400 text-center max-w-md mb-4">
        Copy <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">.env.example</code> to{' '}
        <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">.env.local</code> in{' '}
        <code className="bg-gray-200 dark:bg-gray-700 px-1 rounded">packages/web/</code> and set:
      </p>
      <ul className="text-left text-sm text-gray-600 dark:text-gray-400 list-disc list-inside space-y-1 mb-4">
        <li><code>VITE_COGNITO_USER_POOL_ID</code> (e.g. from CDK stack output)</li>
        <li><code>VITE_COGNITO_CLIENT_ID</code> (e.g. from CDK stack output)</li>
      </ul>
      <p className="text-sm text-gray-500 dark:text-gray-500">
        Restart the dev server after changing env files.
      </p>
    </div>
  );
}

function App() {
  const [user, setUser] = useState<{ username: string } | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const { profile, setProfile, clear: clearAuthStore } = useAuthStore();

  const loadUser = useCallback(async () => {
    try {
      const current = await getCurrentUser();
      setUser({ username: current.username });
    } catch {
      setUser(null);
      clearAuthStore();
    } finally {
      setAuthChecked(true);
    }
  }, [clearAuthStore]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    usersApi
      .getMe()
      .then((p) => {
        if (!cancelled) setProfile(p);
      })
      .catch(() => {
        if (!cancelled) setProfile(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user, setProfile]);

  const handleLogout = useCallback(async () => {
    try {
      await amplifySignOut();
    } finally {
      setUser(null);
      clearAuthStore();
    }
  }, [clearAuthStore]);

  const displayName =
    profile?.displayName?.trim() ||
    (user?.username?.includes('@')
      ? user.username.split('@')[0]
      : user?.username) ||
    'User';
  const profilePhoto = profile?.profilePhoto ?? undefined;

  if (!isCognitoConfigured) {
    return (
      <AppShell>
        <ConfigRequired />
      </AppShell>
    );
  }

  if (!authChecked) {
    return (
      <AppShell>
        <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary to-primary-dark">
          <Dumbbell className="w-14 h-14 text-white animate-spin" aria-label="Loading" />
        </div>
      </AppShell>
    );
  }

  if (!user) {
    const isNativeApp = Capacitor.getPlatform() !== 'web';
    if (isNativeApp) {
      return (
        <AppShell>
        <LoginDialog
          open
          onClose={() => {}}
          onSuccess={() => {
            sessionStorage.setItem('repwise_native_login_redirect', '1');
            loadUser();
          }}
          variant="fullscreen"
        />
        </AppShell>
      );
    }
    return (
      <AppShell>
      <>
        <LandingPage onOpenLogin={() => setLoginOpen(true)} />
        <LoginDialog
          open={loginOpen}
          onClose={() => setLoginOpen(false)}
          onSuccess={loadUser}
        />
      </>
      </AppShell>
    );
  }

  // Dev: force onboarding via ?showOnboarding=1 (ignores profile.onboardingCompletedAt)
  const forceOnboarding =
    import.meta.env.DEV &&
    (new URLSearchParams(window.location.search).get('showOnboarding') === '1' ||
      window.localStorage.getItem('repwise_force_onboarding') === '1');
  const showOnboarding =
    forceOnboarding || (profile != null && profile.onboardingCompletedAt == null);

  if (showOnboarding) {
    return (
      <AppShell>
      <OnboardingFlow
        onComplete={async () => {
          if (forceOnboarding) {
            window.localStorage.removeItem('repwise_force_onboarding');
            window.history.replaceState({}, '', window.location.pathname + window.location.hash);
          }
          const p = await usersApi.getMe();
          setProfile(p);
        }}
      />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <BrowserRouter>
        <NativeLoginRedirect />
        <ToastContainer />
        <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route
          path="/dashboard"
          element={
            <DashboardPage
              displayName={displayName}
              profilePhoto={profilePhoto}
            />
          }
        />
        <Route
          path="/profile"
          element={<ProfilePage onLogout={handleLogout} />}
        />
        <Route
          path="/settings"
          element={<SettingsPage onLogout={handleLogout} />}
        />
        <Route path="/admin" element={<AdminHomePage />} />
        <Route
          path="/admin/builder-ai"
          element={<BuilderAiConfigPage />}
        />
        <Route path="/goals" element={<GoalsPage />} />
        <Route path="/feed" element={<FeedPage />} />
        <Route path="/workout/new" element={<NewWorkoutScreen />} />
        <Route path="/workout/new/ai" element={<AIWorkoutScreen />} />
        <Route path="/workout/new/manual" element={<SelectExercisesScreen />} />
        <Route path="/workout/review" element={<ReviewWorkoutScreen />} />
        <Route path="/workout/execute/:id" element={<WorkoutExecutionPage />} />
        <Route path="/exercises" element={<ExerciseCatalogPage />} />
        <Route path="/metrics" element={<ExerciseMetricsPage />} />
        <Route path="/metrics/exercises/:exerciseId" element={<ExerciseMetricsDetailPage />} />
        <Route path="/workouts" element={<WorkoutsHistoryPage />} />
        <Route path="/workouts/:id" element={<WorkoutDetailPage />} />
      </Routes>
    </BrowserRouter>
    </AppShell>
  );
}

export default App;
