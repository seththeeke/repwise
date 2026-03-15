import { apiClient } from './client';

export interface Gym {
  gymId: string;
  name: string;
  equipmentTypes: string[];
}

export interface GymsListResponse {
  gyms: Gym[];
  defaultGymId: string | null;
}

export const gymsApi = {
  list: () =>
    apiClient.get<GymsListResponse>('/users/me/gyms').then((r) => r.data),

  create: (body: { name: string; equipmentTypes: string[] }) =>
    apiClient.post<Gym>('/users/me/gyms', body).then((r) => r.data),

  update: (gymId: string, body: { name?: string; equipmentTypes?: string[] }) =>
    apiClient.patch<Gym>(`/users/me/gyms/${gymId}`, body).then((r) => r.data),

  delete: (gymId: string) =>
    apiClient.delete(`/users/me/gyms/${gymId}`).then(() => undefined),
};
