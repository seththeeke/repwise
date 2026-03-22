import { Capacitor } from '@capacitor/core';

export function useIsNativeApp(): boolean {
  return Capacitor.getPlatform() !== 'web';
}
