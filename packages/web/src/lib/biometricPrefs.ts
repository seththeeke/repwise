import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

const KEY = 'repwise_biometric_unlock_enabled';

export function isNativeApp(): boolean {
  return Capacitor.getPlatform() !== 'web';
}

export async function getBiometricUnlockEnabled(): Promise<boolean> {
  if (!isNativeApp()) return false;
  const { value } = await Preferences.get({ key: KEY });
  return value === 'true';
}

export async function setBiometricUnlockEnabled(enabled: boolean): Promise<void> {
  await Preferences.set({ key: KEY, value: enabled ? 'true' : 'false' });
}
