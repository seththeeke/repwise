import { Users, UserPlus, Dumbbell } from 'lucide-react';

interface ProfileStatsBarProps {
  followersCount: number;
  followingCount: number;
  totalWorkouts: number;
  onFollowersPress?: () => void;
  onFollowingPress?: () => void;
}

export function ProfileStatsBar({
  followersCount,
  followingCount,
  totalWorkouts,
}: ProfileStatsBarProps) {
  return (
    <div className="flex items-center justify-around py-6 border-b border-gray-200 dark:border-gray-700">
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {followersCount}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Users className="w-4 h-4" />
          Followers
        </span>
      </div>
      <div className="w-px h-12 bg-gray-200 dark:bg-gray-700" />
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {followingCount}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <UserPlus className="w-4 h-4" />
          Following
        </span>
      </div>
      <div className="w-px h-12 bg-gray-200 dark:bg-gray-700" />
      <div className="flex flex-col items-center">
        <span className="text-2xl font-bold text-gray-900 dark:text-white">
          {totalWorkouts}
        </span>
        <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
          <Dumbbell className="w-4 h-4" />
          Workouts
        </span>
      </div>
    </div>
  );
}
