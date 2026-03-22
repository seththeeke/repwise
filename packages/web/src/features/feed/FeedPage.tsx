import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { feedApi } from '@/api/feed';
import { ChevronLeft, Activity } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { Avatar } from '@/components/ui/Avatar';
import { EmptyState } from '@/components/ui/EmptyState';

export function FeedPage() {
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ['feed'],
    queryFn: () => feedApi.list(20),
  });

  const items = data?.items ?? [];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-b from-primary to-primary-dark px-4 pt-12 pb-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
            aria-label="Back"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Activity Feed</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="px-4 py-6">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-8">
            <EmptyState
              icon={<Activity className="w-7 h-7" />}
              heading="No activity yet"
              subtext="Complete workouts to see your feed."
            />
          </div>
        ) : (
          <div className="space-y-4">
            {items.map((item) => (
              <div
                key={item.eventId}
                className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex gap-3"
              >
                <Avatar
                  src={item.actorProfilePhoto}
                  displayName={item.actorDisplayName}
                  size="md"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <span className="font-semibold">{item.actorDisplayName}</span>{' '}
                    {item.eventType === 'pr_hit' ? 'hit a PR' : 'completed a workout'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                    {item.summary}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
