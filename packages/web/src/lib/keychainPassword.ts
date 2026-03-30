import { Capacitor, registerPlugin } from '@capacitor/core';

export interface KeychainPasswordPlugin {
  requestSharedWebCredential(options: { domain?: string }): Promise<{
    username: string;
    password: string;
  }>;
}

export const KeychainPassword = registerPlugin<KeychainPasswordPlugin>('KeychainPasswordPlugin', {
  web: {
    requestSharedWebCredential: async () => {
      throw new Error('Keychain password is only available in the native app');
    },
  },
  android: {
    requestSharedWebCredential: async () => {
      throw new Error('Use the keyboard to fill saved passwords on Android.');
    },
  },
});

export function isKeychainPasswordNative(): boolean {
  return Capacitor.getPlatform() === 'ios';
}
