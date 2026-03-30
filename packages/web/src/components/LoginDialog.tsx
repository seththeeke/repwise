import { useState } from 'react';
import {
  signIn,
  signUp,
  confirmSignUp,
  resetPassword,
  confirmResetPassword,
  signInWithRedirect,
} from 'aws-amplify/auth';
import { Capacitor } from '@capacitor/core';
import { Dumbbell, Loader2, Fingerprint, X } from 'lucide-react';
import { isAppleSignInEnabled } from '@/lib/amplify';
import { KeychainPassword } from '@/lib/keychainPassword';

type View = 'signin' | 'signup' | 'signup-confirm' | 'forgot' | 'forgot-confirm';

type LoginDialogVariant = 'modal' | 'fullscreen';

interface LoginDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  /** Fullscreen: app landing (no overlay, no close); Modal: dialog overlay (default) */
  variant?: LoginDialogVariant;
}

export default function LoginDialog({ open, onClose, onSuccess, variant = 'modal' }: LoginDialogProps) {
  const [view, setView] = useState<View>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [emailError, setEmailError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [keychainLoading, setKeychainLoading] = useState(false);

  const resetForm = () => {
    setView('signin');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setCode('');
    setError('');
    setSuccessMessage('');
    setEmailError('');
    setConfirmPasswordError('');
  };

  const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.trim());
  const handleEmailBlur = () => {
    if (email.trim() && !isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
    } else {
      setEmailError('');
    }
  };
  const handleConfirmPasswordChange = (v: string) => {
    setConfirmPassword(v);
    setConfirmPasswordError(v && v !== password ? 'Passwords do not match' : '');
  };
  const handlePasswordChange = (v: string) => {
    setPassword(v);
    if (confirmPassword) setConfirmPasswordError(v !== confirmPassword ? 'Passwords do not match' : '');
  };

  const handleClose = () => {
    if (!loading) {
      resetForm();
      onClose();
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn({ username: email, password });
      setLoading(false);
      onSuccess();
      onClose();
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Sign-in failed. Check your email and password.');
    }
  };

  const handleKeychainPassword = async () => {
    setError('');
    setKeychainLoading(true);
    try {
      const { username, password: pw } = await KeychainPassword.requestSharedWebCredential({
        domain: 'repwisefit.com',
      });
      setEmail(username);
      setPassword(pw);
      setEmailError('');
    } catch (err) {
      const msg =
        err && typeof err === 'object' && 'message' in err && typeof (err as Error).message === 'string'
          ? (err as Error).message
          : 'Could not load saved password.';
      setError(msg);
    } finally {
      setKeychainLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithRedirect({ provider: 'Apple' });
    } catch (err) {
      setLoading(false);
      setError(
        err instanceof Error ? err.message : 'Sign in with Apple could not start. Try again.'
      );
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await signUp({
        username: email,
        password,
        options: { userAttributes: { email } },
      });
      setLoading(false);
      setSuccessMessage('Check your email for a confirmation code.');
      setView('signup-confirm');
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Sign up failed.');
    }
  };

  const handleConfirmSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await confirmSignUp({ username: email, confirmationCode: code });
      setLoading(false);
      setSuccessMessage('Account confirmed. You can sign in now.');
      setView('signin');
      setCode('');
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Confirmation failed.');
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!isValidEmail(email)) {
      setEmailError('Please enter a valid email address');
      return;
    }
    setLoading(true);
    try {
      await resetPassword({ username: email });
      setLoading(false);
      setSuccessMessage('Check your email for a reset code.');
      setView('forgot-confirm');
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Failed to send reset code.');
    }
  };

  const handleConfirmResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    setLoading(true);
    try {
      await confirmResetPassword({ username: email, confirmationCode: code, newPassword: password });
      setLoading(false);
      setSuccessMessage('Password reset. You can sign in now.');
      setView('signin');
      setCode('');
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setLoading(false);
      setError(err instanceof Error ? err.message : 'Password reset failed.');
    }
  };

  if (!open && variant === 'modal') return null;

  const isFullscreen = variant === 'fullscreen';
  const title =
    view === 'signin'
      ? 'Log in'
      : view === 'signup'
        ? 'Create account'
        : view === 'signup-confirm'
          ? 'Confirm your email'
          : view === 'forgot'
            ? 'Forgot password'
            : 'Reset password';

  const headerContent = (
    <>
      <div className="w-16 h-16 bg-violet-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg">
        <Dumbbell className="w-8 h-8 text-white" />
      </div>
      <h2 id="login-dialog-title" className="text-xl font-bold text-gray-900 dark:text-white">
        {title}
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
        Track your fitness journey
      </p>
    </>
  );

  const formContent = (
    <div className="p-6 space-y-4">
          {successMessage && (
            <div className="p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 text-sm">
              {successMessage}
            </div>
          )}
          {error && (
            <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {view === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              {isAppleSignInEnabled ? (
                <>
                  <button
                    type="button"
                    onClick={() => void handleAppleSignIn()}
                    disabled={loading}
                    className="w-full py-3 px-4 rounded-xl bg-black text-white font-medium flex items-center justify-center gap-2 hover:bg-gray-900 disabled:opacity-50"
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
                      <path
                        fill="currentColor"
                        d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.63 3.38 1.56-3.14 1.88-2.54 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.03-.03zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                      />
                    </svg>
                    Sign in with Apple
                  </button>
                  <p className="text-center text-xs text-gray-500 dark:text-gray-400">or use email</p>
                </>
              ) : null}
              <div>
                <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="login-email"
                  name="username"
                  type="email"
                  inputMode="email"
                  autoCorrect="off"
                  autoCapitalize="none"
                  spellCheck={false}
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  onBlur={handleEmailBlur}
                  className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all ${
                    emailError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter your email"
                  required
                  autoComplete="username"
                />
                {emailError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{emailError}</p>}
              </div>
              <div>
                <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  id="login-password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-all"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
              </div>
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
              <div className="flex flex-col gap-2 text-center text-sm">
                <button
                  type="button"
                  onClick={() => { setView('signup'); setError(''); setSuccessMessage(''); }}
                  className="text-violet-600 dark:text-violet-400 hover:underline"
                >
                  Create account
                </button>
                <button
                  type="button"
                  onClick={() => { setView('forgot'); setError(''); setSuccessMessage(''); }}
                  className="text-gray-500 dark:text-gray-400 hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              {Capacitor.getPlatform() === 'ios' ? (
                <button
                  type="button"
                  onClick={() => void handleKeychainPassword()}
                  disabled={loading || keychainLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/80 text-gray-800 dark:text-gray-100 text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50"
                >
                  {keychainLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin shrink-0" aria-hidden />
                  ) : (
                    <Fingerprint className="w-5 h-5 text-primary shrink-0" aria-hidden />
                  )}
                  Use FaceID to unlock iCloud Keychain
                </button>
              ) : null}
            </form>
          )}

          {view === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              <div>
                <label htmlFor="signup-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  onBlur={handleEmailBlur}
                  className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    emailError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                />
                {emailError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{emailError}</p>}
              </div>
              <div>
                <label htmlFor="signup-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="signup-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm password
                </label>
                <input
                  id="signup-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    confirmPasswordError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Confirm password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                {confirmPasswordError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{confirmPasswordError}</p>}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Sign Up'}
              </button>
              <button
                type="button"
                onClick={() => { setView('signin'); setError(''); }}
                className="w-full text-sm text-gray-500 dark:text-gray-400 hover:underline"
              >
                Back to sign in
              </button>
            </form>
          )}

          {view === 'signup-confirm' && (
            <form onSubmit={handleConfirmSignUp} className="space-y-4">
              <div>
                <label htmlFor="confirm-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="confirm-email"
                  type="email"
                  value={email}
                  readOnly
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                />
              </div>
              <div>
                <label htmlFor="confirm-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirmation code
                </label>
                <input
                  id="confirm-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter code from email"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Confirm'}
              </button>
              <button
                type="button"
                onClick={() => { setView('signin'); setError(''); setSuccessMessage(''); }}
                className="w-full text-sm text-gray-500 dark:text-gray-400 hover:underline"
              >
                Back to sign in
              </button>
            </form>
          )}

          {view === 'forgot' && (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Enter your email and we&apos;ll send you a code to reset your password.
              </p>
              <div>
                <label htmlFor="forgot-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="forgot-email"
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setEmailError(''); }}
                  onBlur={handleEmailBlur}
                  className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-700 text-gray-900 dark:text-white ${
                    emailError ? 'border-red-500' : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder="Enter your email"
                  required
                  autoComplete="email"
                />
                {emailError && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{emailError}</p>}
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Send reset code'}
              </button>
              <button
                type="button"
                onClick={() => { setView('signin'); setError(''); setSuccessMessage(''); }}
                className="w-full text-sm text-gray-500 dark:text-gray-400 hover:underline"
              >
                Back to sign in
              </button>
            </form>
          )}

          {view === 'forgot-confirm' && (
            <form onSubmit={handleConfirmResetPassword} className="space-y-4">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  id="reset-email"
                  type="email"
                  value={email}
                  readOnly
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400"
                />
              </div>
              <div>
                <label htmlFor="reset-code" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Reset code
                </label>
                <input
                  id="reset-code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter code from email"
                  required
                />
              </div>
              <div>
                <label htmlFor="reset-password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  New password
                </label>
                <input
                  id="reset-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="At least 8 characters"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div>
                <label htmlFor="reset-confirm" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Confirm new password
                </label>
                <input
                  id="reset-confirm"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Confirm password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white font-semibold rounded-xl flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Reset password'}
              </button>
              <button
                type="button"
                onClick={() => { setView('signin'); setError(''); setSuccessMessage(''); }}
                className="w-full text-sm text-gray-500 dark:text-gray-400 hover:underline"
              >
                Back to sign in
              </button>
            </form>
          )}
    </div>
  );

  if (isFullscreen) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-primary to-primary-dark"
        role="dialog"
        aria-labelledby="login-dialog-title"
      >
        <div className="w-full max-w-sm flex flex-col items-center mb-6">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mb-4">
            <Dumbbell className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">Repwise</h1>
          <p className="text-sm text-white/80 mt-1">Track your fitness journey</p>
        </div>
        <div className="w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="flex flex-col items-center pt-6 pb-2 px-6 bg-gradient-to-b from-violet-50 to-white dark:from-gray-800 dark:to-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          </div>
          {formContent}
        </div>
      </div>
    );
  }

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
          {headerContent}
        </div>
        {formContent}
      </div>
    </div>
  );
}
