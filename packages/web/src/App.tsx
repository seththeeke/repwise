import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Authenticator } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import { isCognitoConfigured } from './lib/amplify';
import DashboardPage from './pages/DashboardPage';

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
  if (!isCognitoConfigured) {
    return <ConfigRequired />;
  }
  return (
    <BrowserRouter>
      <Authenticator>
        {({ signOut, user }) => {
          const displayName =
            (user?.signInDetails?.loginId as string | undefined)?.split('@')[0] ??
            (user?.username as string | undefined) ??
            'User';
          return (
            <Routes>
              <Route
                path="/"
                element={
                  <DashboardPage displayName={displayName} onLogout={signOut} />
                }
              />
            </Routes>
          );
        }}
      </Authenticator>
    </BrowserRouter>
  );
}

export default App;
