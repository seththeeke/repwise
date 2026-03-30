import { BiometricAuth } from '@aparajita/capacitor-biometric-auth';
import { isNativeApp } from './biometricPrefs';

export async function isBiometryAvailableForUnlock(): Promise<boolean> {
  if (!isNativeApp()) return false;
  try {
    const r = await BiometricAuth.checkBiometry();
    return r.isAvailable === true || r.strongBiometryIsAvailable === true;
  } catch {
    return false;
  }
}

/** Prompt Face ID / Touch ID / device PIN. Throws on failure. */
export async function authenticateForAppUnlock(): Promise<void> {
  await BiometricAuth.authenticate({
    reason: 'Unlock Repwise',
    cancelTitle: 'Cancel',
    allowDeviceCredential: true,
    iosFallbackTitle: 'Use Passcode',
    androidTitle: 'Unlock',
    androidSubtitle: 'Use your biometric or device PIN',
  });
}
