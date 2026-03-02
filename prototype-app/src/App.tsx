import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { WorkoutProvider } from './context/WorkoutContext';
import { GoalsProvider } from './context/GoalsContext';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import CreateWorkoutPage from './pages/CreateWorkoutPage';
import ActiveWorkoutPage from './pages/ActiveWorkoutPage';
import ProfilePage from './pages/ProfilePage';
import GoalsPage from './pages/GoalsPage';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth();
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
}

function AppRoutes() {
  const { isAuthenticated } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />}
      />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workout/new"
        element={
          <ProtectedRoute>
            <CreateWorkoutPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/workout/active"
        element={
          <ProtectedRoute>
            <ActiveWorkoutPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/goals"
        element={
          <ProtectedRoute>
            <GoalsPage />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <WorkoutProvider>
          <GoalsProvider>
            <AppRoutes />
          </GoalsProvider>
        </WorkoutProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
