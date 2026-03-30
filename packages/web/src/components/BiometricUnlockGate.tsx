import { useState, useEffect, useCallback, useRef, type ReactNode } from 'react';
import { Capacitor } from '@capacitor/core';
import { Dumbbell, Fingerprint } from 'lucide-react';
import { getBiometricUnlockEnabled } from '@/lib/biometricPrefs';
import { authenticateForAppUnlock } from '@/lib/biometricAuth';

interface BiometricUnlockGateProps {
  children: ReactNode;
  /** Called when user chooses password instead (parent should sign out). */
  onUsePassword: () => void;
}

/**
 * On native, if the user enabled "Face ID / Touch ID" in Settings, block the main UI until biometry succeeds.
 */
export function BiometricUnlockGate({ children, onUsePassword }: BiometricUnlockGateProps) {
  const [ready, setReady] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const autoPrompted = useRef(false);

  const tryUnlock = useCallback(async () => {
    setError('');
    setBusy(true);
    try {
      await authenticateForAppUnlock();
      setUnlocked(true);
    } catch {
      setError('Biometric unlock failed. Try again or use password.');
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (Capacitor.getPlatform() === 'web') {
        setUnlocked(true);
        setReady(true);
        return;
      }
      const enabled = await getBiometricUnlockEnabled();
      if (cancelled) return;
      if (!enabled) {
        setUnlocked(true);
        setReady(true);
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready || unlocked || Capacitor.getPlatform() === 'web' || autoPrompted.current) return;
    autoPrompted.current = true;
    void tryUnlock();
  }, [ready, unlocked, tryUnlock]);

  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-primary to-primary-dark">
        <Dumbbell className="w-14 h-14 text-white animate-spin" aria-label="Loading" />
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-primary to-primary-dark">
        <Fingerprint className="w-16 h-16 text-white mb-6" aria-hidden />
        <h1 className="text-xl font-semibold text-white text-center mb-2">Unlock Repwise</h1>
        <p className="text-sm text-white/80 text-center mb-6 max-w-xs">
          Use Face ID, Touch ID, or your device passcode to continue.
        </p>
        {error ? (
          <p className="text-sm text-amber-200 text-center mb-4 max-w-sm">{error}</p>
        ) : null}
        <button
          type="button"
          disabled={busy}
          onClick={() => void tryUnlock()}
          className="w-full max-w-xs py-3 px-4 bg-white text-primary font-semibold rounded-xl shadow-lg mb-3 disabled:opacity-60"
        >
          {busy ? 'Unlocking…' : 'Try again'}
        </button>
        <button
          type="button"
          onClick={onUsePassword}
          className="text-sm text-white/90 underline"
        >
          Use password instead
        </button>
      </div>
    );
  }

  return <>{children}</>;
}
