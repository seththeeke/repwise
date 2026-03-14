import { useState } from 'react';
import { signIn } from 'aws-amplify/auth';
import { Dumbbell, Loader2, X } from 'lucide-react';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function LoginDialog({ open, onClose, onSuccess }: LoginDialogProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await signIn({
        username: email,
        password,
      });
      setLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      setLoading(false);
      const message = err instanceof Error ? err.message : 'Sign-in failed. Check your email and password.';
      setError(message);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setError('');
      setEmail('');
      setPassword('');
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="login-dialog-title"
    >
      <div
        className="relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex flex-col items-center pt-6 pb-4 px-6 bg-gradient-to-b from-violet-50 to-white dark:from-gray-800 dark:to-gray-800">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h2 id="login-dialog-title" className="text-xl font-bold text-gray-900 dark:text-white">
            Log in
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track your fitness journey
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Email
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              placeholder="Enter your email"
              required
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
            />
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/30 transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
