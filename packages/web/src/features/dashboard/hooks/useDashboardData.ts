import { useQuery } from '@tanstack/react-query';
import { metricsApi } from '@/api/metrics';
import { workoutsApi } from '@/api/workouts';
import { goalsApi } from '@/api/goals';
import { feedApi } from '@/api/feed';
import { GoalStatus, type Goal } from '@/types';

function ninetyDaysAgo(): string {
  const d = new Date();
  d.setDate(d.getDate() - 90);
  return d.toISOString();
}

async function fetchDashboard() {
  const from = ninetyDaysAgo();
  const [globalMetrics, workoutsRes, activeGoals, feedRes, exerciseMetricsList] =
    await Promise.all([
      metricsApi.getGlobal(),
      workoutsApi.list({ status: 'completed', limit: 50 }),
      goalsApi.list(GoalStatus.ACTIVE),
      feedApi.list(10),
      metricsApi.listExercises(),
    ]);

  const recentWorkouts = (workoutsRes.items ?? []).filter(
    (w) => w.completedAt && w.completedAt >= from
  );

  const exerciseMetrics = Array.isArray(exerciseMetricsList)
    ? exerciseMetricsList
    : [];

  const goalsList = Array.isArray(activeGoals)
    ? activeGoals
    : Array.isArray((activeGoals as { items?: unknown[] })?.items)
      ? (activeGoals as { items: Goal[] }).items
      : [];

  return {
    globalMetrics,
    recentWorkouts,
    activeGoals: goalsList,
    feedItems: feedRes.items ?? [],
    exerciseMetrics,
  };
}

export function useDashboardData() {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboard,
    staleTime: 60_000,
  });
}
