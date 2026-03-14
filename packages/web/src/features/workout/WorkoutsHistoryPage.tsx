import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { workoutsApi } from '@/api/workouts';
import { useWorkoutDraftStore } from '@/stores/workoutDraftStore';
import { WorkoutSource, PermissionType } from '@/types';
import { ChevronLeft, Dumbbell } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

const PAGE_SIZE = 20;

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function WorkoutsHistoryPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fromBuilder = searchParams.get('from') === 'builder';
  const setDraft = useWorkoutDraftStore((s) => s.setDraft);
  const [nextTokens, setNextTokens] = useState<string[]>([]);
  const [page, setPage] = useState(0);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['workouts-history', page, nextTokens[page]],
    queryFn: async () => {
      const nextToken = page === 0 ? undefined : nextTokens[page];
      return workoutsApi.list({
        status: 'completed',
        limit: PAGE_SIZE,
        nextToken,
      });
    },
    placeholderData: (prev) => prev,
  });

  const items = data?.items ?? [];
  const nextToken = data?.nextToken;

  const goNext = () => {
    if (nextToken) {
      setNextTokens((prev) => {
        const next = [...prev];
        if (next.length <= page + 1) next.push(nextToken);
        else next[page + 1] = nextToken;
        return next;
      });
      setPage((p) => p + 1);
    }
  };

  const goPrev = () => {
    if (page > 0) setPage((p) => p - 1);
  };

  const handleWorkoutClick = async (id: string) => {
    if (fromBuilder) {
      setLoadingId(id);
      try {
        const w = await workoutsApi.getById(id);
        const exercises = (w.exercises ?? []).map((ex, i) => ({
          ...ex,
          orderIndex: i,
          skipped: false,
        }));
        setDraft({
          exercises,
          source: WorkoutSource.MANUAL,
          permissionType: (w.permissionType as PermissionType) ?? PermissionType.FOLLOWERS_ONLY,
        });
        navigate('/workout/review');
      } finally {
        setLoadingId(null);
      }
      return;
    }
    navigate(`/workouts/${id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
      <div className="bg-gradient-to-b from-primary to-primary-dark px-4 pt-12 pb-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => (fromBuilder ? navigate('/workout/new') : navigate(-1))}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">
            {fromBuilder ? 'Choose past workout' : 'Workout history'}
          </h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="px-4 -mt-2">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-500 dark:text-gray-400">
              No completed workouts yet.
            </p>
          </div>
        ) : (
          <>
            <ul className="space-y-2">
              {items.map((w) => (
                <li key={w.workoutInstanceId}>
                  <button
                    type="button"
                    onClick={() => handleWorkoutClick(w.workoutInstanceId)}
                    disabled={loadingId != null}
                    className="w-full bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center gap-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors disabled:opacity-70"
                  >
                    <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Dumbbell className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {loadingId === w.workoutInstanceId ? (
                        <div className="flex items-center gap-2">
                          <Spinner />
                          <span className="text-sm text-gray-500">Loading...</span>
                        </div>
                      ) : (
                        <>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {w.completedAt
                              ? formatDate(w.completedAt)
                              : formatDate(w.startedAt)}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {(w.exercises?.length ?? 0)} exercises
                            {w.durationMinutes != null && w.durationMinutes > 0
                              ? ` · ${w.durationMinutes} min`
                              : ''}
                          </p>
                        </>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>

            <div className="flex items-center justify-between mt-6">
              <button
                type="button"
                onClick={goPrev}
                disabled={page === 0}
                className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Page {page + 1}
              </span>
              <button
                type="button"
                onClick={goNext}
                disabled={!nextToken || isFetching}
                className="px-4 py-2 rounded-lg bg-primary text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isFetching ? 'Loading...' : 'Next'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
