import { create } from 'zustand';
import type { UserProfile } from '@/types';

interface AuthStore {
  userId: string | null;
  profile: UserProfile | null;
  setProfile: (profile: UserProfile) => void;
  clear: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  userId: null,
  profile: null,
  setProfile: (profile) =>
    set({ userId: profile.userId, profile }),
  clear: () => set({ userId: null, profile: null }),
}));
