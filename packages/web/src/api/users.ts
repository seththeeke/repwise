import { apiClient } from './client';
import type { UserProfile } from '@/types';

export const usersApi = {
  getMe: () => apiClient.get<UserProfile>('/users/me').then((r) => r.data),

  patchMe: (
    updates: Partial<
      Pick<
        UserProfile,
        | 'displayName'
        | 'bio'
        | 'profilePhoto'
        | 'weightUnit'
        | 'defaultPermissionType'
        | 'isPrivate'
      >
    >
  ) => apiClient.patch<UserProfile>('/users/me', updates).then((r) => r.data),

  getByUsername: (username: string) =>
    apiClient.get<UserProfile>(`/users/${username}`).then((r) => r.data),
};
