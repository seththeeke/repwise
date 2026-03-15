import { Dumbbell } from 'lucide-react';

interface LandingPageProps {
  onOpenLogin: () => void;
}

export default function LandingPage({ onOpenLogin }: LandingPageProps) {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-violet-50 to-white dark:from-gray-900 dark:to-gray-800">
      <header className="px-4 py-6 flex items-center justify-between max-w-6xl mx-auto w-full">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-violet-600 rounded-xl flex items-center justify-center shadow-lg">
            <Dumbbell className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-gray-900 dark:text-white">
            Repwise
          </span>
        </div>
        <button
          type="button"
          onClick={onOpenLogin}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/30 transition-all"
        >
          Log in
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12 text-center max-w-2xl mx-auto">
        <div className="w-20 h-20 bg-violet-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
          <Dumbbell className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4 tracking-tight">
          Track your fitness journey
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 mb-8">
          Log workouts, set goals, and see your progress over time—all in one
          simple place.
        </p>
        <button
          type="button"
          onClick={onOpenLogin}
          className="px-8 py-4 bg-violet-600 hover:bg-violet-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/30 transition-all text-lg"
        >
          Get started — Log in
        </button>
      </main>

      <footer className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Repwise
      </footer>
    </div>
  );
}
