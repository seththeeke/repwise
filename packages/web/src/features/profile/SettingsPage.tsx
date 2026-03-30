import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';
import { LogOut, ChevronLeft, Trash2, Fingerprint } from 'lucide-react';
import { getBiometricUnlockEnabled, setBiometricUnlockEnabled } from '@/lib/biometricPrefs';
import { isBiometryAvailableForUnlock } from '@/lib/biometricAuth';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { useToastStore } from '@/stores/toastStore';
import { usersApi } from '@/api/users';

interface SettingsPageProps {
  onLogout: () => void;
}

export function SettingsPage({ onLogout }: SettingsPageProps) {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteAcknowledged, setDeleteAcknowledged] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [bioSectionReady, setBioSectionReady] = useState(false);
  const [bioAvailable, setBioAvailable] = useState(false);
  const [bioEnabled, setBioEnabled] = useState(false);

  useEffect(() => {
    if (Capacitor.getPlatform() === 'web') {
      setBioSectionReady(true);
      return;
    }
    let cancelled = false;
    void (async () => {
      const [avail, enabled] = await Promise.all([
        isBiometryAvailableForUnlock(),
        getBiometricUnlockEnabled(),
      ]);
      if (!cancelled) {
        setBioAvailable(avail);
        setBioEnabled(enabled);
        setBioSectionReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await usersApi.deleteMe();
      setDeleteOpen(false);
      await onLogout();
    } catch {
      addToast({
        type: 'error',
        message: 'Could not delete your account. Please try again or contact support.',
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-b from-primary to-primary-dark px-4 pt-12 pb-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Settings</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="px-4 py-6 space-y-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
          <p className="px-4 py-3 text-sm text-gray-500 dark:text-gray-400">
            Display name, bio, weight unit, and privacy can be edited from your
            profile.
          </p>
        </div>

        {bioSectionReady && Capacitor.getPlatform() !== 'web' && bioAvailable ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
            <label className="flex items-start gap-3 px-4 py-4 cursor-pointer">
              <Fingerprint className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" aria-hidden />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-gray-900 dark:text-white">Face ID / Touch ID</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                  Ask for biometric unlock when you open the app after signing in.
                </p>
              </div>
              <input
                type="checkbox"
                className="mt-1 rounded border-gray-300 dark:border-gray-600"
                checked={bioEnabled}
                onChange={(e) => {
                  const v = e.target.checked;
                  setBioEnabled(v);
                  void setBiometricUnlockEnabled(v);
                }}
              />
            </label>
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => onLogout()}
          className="w-full py-3 px-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Sign out
        </button>

        <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => {
              setDeleteAcknowledged(false);
              setDeleteOpen(true);
            }}
            className="w-full py-3 px-4 text-gray-600 dark:text-gray-400 hover:text-red-600 dark:hover:text-red-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2 text-sm"
          >
            <Trash2 className="w-4 h-4" />
            Delete account
          </button>
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => !deleting && setDeleteOpen(false)}
        title="Delete account"
        variant="center"
      >
        <div className="px-4 py-4 space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            Your profile, workouts, goals, metrics, and related data will be permanently removed.
            Your sign-in will be deleted and this cannot be undone.
          </p>
          <label className="flex items-start gap-3 cursor-pointer text-sm text-gray-800 dark:text-gray-200">
            <input
              type="checkbox"
              className="mt-0.5 rounded border-gray-300 dark:border-gray-600"
              checked={deleteAcknowledged}
              onChange={(e) => setDeleteAcknowledged(e.target.checked)}
            />
            <span>I understand my account and data will be permanently deleted.</span>
          </label>
          <div className="flex flex-col gap-2 pt-2">
            <Button
              type="button"
              variant="destructive"
              className="w-full"
              disabled={!deleteAcknowledged || deleting}
              onClick={() => void handleDeleteAccount()}
            >
              {deleting ? 'Deleting…' : 'Delete my account'}
            </Button>
            <button
              type="button"
              className="w-full py-2 text-sm text-gray-600 dark:text-gray-400"
              disabled={deleting}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
