import { useState, useEffect, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { getCurrentUser, signOut as amplifySignOut } from 'aws-amplify/auth';
import { isCognitoConfigured } from './lib/amplify';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import LoginDialog from './components/LoginDialog';

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

  const loadUser = useCallback(async () => {
    try {
      const current = await getCurrentUser();
      setUser({ username: current.username });
    } catch {
      setUser(null);
    } finally {
      setAuthChecked(true);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const handleLogout = useCallback(async () => {
    try {
      await amplifySignOut();
    } finally {
      setUser(null);
    }
  }, []);

  const displayName =
    user?.username?.includes('@')
      ? user.username.split('@')[0]
      : user?.username ?? 'User';

  if (!isCognitoConfigured) {
    return <ConfigRequired />;
  }

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <p className="text-gray-500 dark:text-gray-400">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LandingPage onOpenLogin={() => setLoginOpen(true)} />
        <LoginDialog
          open={loginOpen}
          onClose={() => setLoginOpen(false)}
          onSuccess={loadUser}
        />
      </>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <DashboardPage displayName={displayName} onLogout={handleLogout} />
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
