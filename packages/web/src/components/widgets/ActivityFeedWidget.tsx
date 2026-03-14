import { Award, Dumbbell } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import type { FeedItem } from '@/types';

interface ActivityFeedWidgetProps {
  feedItems: FeedItem[];
  onLoadMore?: () => void;
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffHours = Math.floor(
    (now.getTime() - date.getTime()) / (1000 * 60 * 60)
  );
  if (diffHours < 1) return 'Just now';
  if (diffHours === 1) return '1 hour ago';
  if (diffHours < 24) return `${diffHours} hours ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays} days ago`;
}

export function ActivityFeedWidget({
  feedItems,
}: ActivityFeedWidgetProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <h2 className="font-semibold text-gray-900 dark:text-white mb-4">
        Activity Feed
      </h2>
      <div className="space-y-4">
        {feedItems.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4 text-center">
            No activity yet
          </p>
        ) : (
          feedItems.map((item) => (
            <div key={item.eventId} className="flex gap-3">
              <Avatar
                src={item.actorProfilePhoto}
                displayName={item.actorDisplayName}
                size="md"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm">
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {item.actorDisplayName}
                      </span>{' '}
                      <span className="text-gray-600 dark:text-gray-400">
                        {item.eventType === 'pr_hit'
                          ? 'hit a new PR'
                          : 'completed a workout'}
                      </span>
                    </p>
                    <p className="text-sm text-gray-900 dark:text-white mt-0.5">
                      {item.summary}
                    </p>
                    {item.eventType === 'pr_hit' ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                        <Award className="w-3 h-3 text-amber-500" />
                        PR
                      </p>
                    ) : null}
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
