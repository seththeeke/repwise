import { Dumbbell, LogOut } from 'lucide-react';

interface DashboardPageProps {
  displayName: string;
  onLogout: () => void;
}

export default function DashboardPage({ displayName, onLogout }: DashboardPageProps) {

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="bg-gradient-to-b from-violet-600 to-violet-700 px-4 pt-12 pb-8">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <p className="text-violet-200 text-sm">Welcome back</p>
          <h1 className="text-2xl font-bold text-white">Hello, {displayName}</h1>
        </div>
      </div>

      <div className="flex-1 px-4 py-6">
        <p className="text-gray-600 dark:text-gray-400 text-center text-sm">
          You’re signed in. More features (workouts, goals, profile) will appear here as we build them.
        </p>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-800">
        <button
          type="button"
          onClick={onLogout}
          className="w-full py-3 px-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Log out
        </button>
      </div>
    </div>
  );
}
