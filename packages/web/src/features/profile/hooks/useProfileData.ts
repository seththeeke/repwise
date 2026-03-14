import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users';
import { metricsApi } from '@/api/metrics';
import { workoutsApi } from '@/api/workouts';

export const profileQueryKey = ['profile'];

export function useProfileData() {
  return useQuery({
    queryKey: profileQueryKey,
    queryFn: async () => {
      const [profile, globalMetrics, exerciseMetricsList, workoutsRes] =
        await Promise.all([
          usersApi.getMe(),
          metricsApi.getGlobal(),
          metricsApi.listExercises(),
          workoutsApi.list({ status: 'completed', limit: 20 }),
        ]);

      const exerciseMetrics = Array.isArray(exerciseMetricsList)
        ? exerciseMetricsList
        : [];
      const recentWorkouts = workoutsRes.items ?? [];

      return {
        profile,
        globalMetrics,
        exerciseMetrics,
        recentWorkouts,
      };
    },
    staleTime: 60_000,
  });
}

export function useInvalidateProfile() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: profileQueryKey });
}
