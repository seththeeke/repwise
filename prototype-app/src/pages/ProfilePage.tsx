import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useWorkout } from '../context/WorkoutContext';
import { mockUserProfile, mockGlobalMetrics, mockExerciseMetrics } from '../data/mockData';
import {
  ArrowLeft,
  Settings,
  Users,
  UserPlus,
  Dumbbell,
  Flame,
  Trophy,
  TrendingUp,
  Calendar,
  LogOut,
  Edit2,
} from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { recentWorkouts } = useWorkout();

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) return `${(volume / 1000000).toFixed(1)}M`;
    if (volume >= 1000) return `${(volume / 1000).toFixed(1)}K`;
    return volume.toString();
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-8">
      {/* Header */}
      <div className="bg-gradient-to-b from-violet-600 to-violet-700 px-4 pt-12 pb-24">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/')}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Profile</h1>
          <button
            onClick={() => {}}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <Settings className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Profile Card */}
      <div className="px-4 -mt-16">
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg">
          <div className="flex items-start gap-4">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
              {mockUserProfile.displayName.charAt(0)}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {mockUserProfile.displayName}
                </h2>
                <button className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
                  <Edit2 className="w-4 h-4 text-gray-400" />
                </button>
              </div>
              <p className="text-gray-500 dark:text-gray-400">@{mockUserProfile.username}</p>
              {mockUserProfile.bio && (
                <p className="text-gray-700 dark:text-gray-300 mt-2 text-sm">{mockUserProfile.bio}</p>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="flex items-center justify-around mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button className="flex flex-col items-center">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {mockUserProfile.followersCount}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Users className="w-4 h-4" />
                Followers
              </span>
            </button>
            <div className="w-px h-12 bg-gray-200 dark:bg-gray-700" />
            <button className="flex flex-col items-center">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {mockUserProfile.followingCount}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <UserPlus className="w-4 h-4" />
                Following
              </span>
            </button>
            <div className="w-px h-12 bg-gray-200 dark:bg-gray-700" />
            <div className="flex flex-col items-center">
              <span className="text-2xl font-bold text-gray-900 dark:text-white">
                {mockGlobalMetrics.totalWorkouts}
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-1">
                <Dumbbell className="w-4 h-4" />
                Workouts
              </span>
            </div>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {mockGlobalMetrics.currentStreak}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Day Streak</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {mockGlobalMetrics.longestStreak}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Best Streak</p>
              </div>
            </div>
          </div>
        </div>

        {/* Member Since */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mt-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">Member since</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(mockUserProfile.createdAt)}
              </p>
            </div>
          </div>
        </div>

        {/* Personal Records */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mt-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            Personal Records
          </h3>
          <div className="space-y-3">
            {mockExerciseMetrics.map((metric) => (
              <div
                key={metric.exerciseId}
                className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{metric.exerciseName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{metric.totalSessions} sessions</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-gray-900 dark:text-white">{metric.maxWeight} lbs</p>
                  <p
                    className={`text-xs flex items-center justify-end gap-1 ${
                      metric.recentProgress >= 0 ? 'text-green-500' : 'text-red-500'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3" />
                    {metric.recentProgress > 0 ? '+' : ''}
                    {metric.recentProgress}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Workouts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mt-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Dumbbell className="w-5 h-5 text-violet-500" />
            Recent Workouts
          </h3>
          <div className="space-y-3">
            {recentWorkouts.slice(0, 5).map((workout) => (
              <div
                key={workout.workoutInstanceId}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
              >
                <div className="w-10 h-10 bg-violet-100 dark:bg-violet-900/30 rounded-lg flex items-center justify-center">
                  <Dumbbell className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm truncate">
                    {workout.exercises.map((e) => e.exerciseName.split(' ')[0]).slice(0, 3).join(', ')}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {workout.exercises.length} exercises · {workout.durationMinutes} min
                  </p>
                </div>
                <div className="text-right text-xs text-gray-500 dark:text-gray-400">
                  {formatVolume(workout.totalVolume || 0)} lbs
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Logout Button */}
        <button
          onClick={() => {
            logout();
            navigate('/login');
          }}
          className="w-full mt-6 py-3 px-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Log Out
        </button>
      </div>
    </div>
  );
}
