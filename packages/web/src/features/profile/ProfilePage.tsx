import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfileData } from './hooks/useProfileData';
import { useInvalidateProfile } from './hooks/useProfileData';
import { ProfileHeader, ProfileCard } from './ProfileHeader';
import { ProfileStatsBar } from './ProfileStatsBar';
import { EditProfileSheet } from './EditProfileSheet';
import { StreakWidget } from '@/components/widgets/StreakWidget';
import { PersonalRecordsWidget } from '@/components/widgets/PersonalRecordsWidget';
import { WeekCalendarWidget } from '@/components/widgets/WeekCalendarWidget';
import { RecentWorkoutsWidget } from '@/components/widgets/RecentWorkoutsWidget';
import { Spinner } from '@/components/ui/Spinner';
import { LogOut, Flame, Trophy, Calendar } from 'lucide-react';

interface ProfilePageProps {
  onLogout: () => void;
}

export function ProfilePage({ onLogout }: ProfilePageProps) {
  const navigate = useNavigate();
  const { data, isLoading, error } = useProfileData();
  const invalidateProfile = useInvalidateProfile();
  const [editOpen, setEditOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Spinner />
      </div>
    );
  }

  if (error || !data?.profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <p className="text-red-600 dark:text-red-400 text-center">
          Failed to load profile. Please try again.
        </p>
      </div>
    );
  }

  const { profile, globalMetrics, exerciseMetrics, recentWorkouts } = data;
  const prRecords = (Array.isArray(exerciseMetrics) ? exerciseMetrics : [])
    .slice()
    .sort((a, b) => b.maxWeight - a.maxWeight)
    .slice(0, 5)
    .map((em) => ({
      exerciseName: em.exerciseName,
      maxWeight: em.maxWeight,
      maxWeightUnit: em.maxWeightUnit,
      totalSessions: em.totalSessions,
    }));

  const memberSince = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
      })
    : null;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-24">
      <ProfileHeader profile={profile} onEditClick={() => setEditOpen(true)} />

      <div className="px-4 -mt-16">
        <ProfileCard profile={profile} onEditClick={() => setEditOpen(true)} />

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden mt-4">
          <ProfileStatsBar
            followersCount={profile.followersCount ?? 0}
            followingCount={profile.followingCount ?? 0}
            totalWorkouts={globalMetrics?.totalWorkouts ?? 0}
          />
        </div>

        {/* Quick stats: streak cards */}
        {globalMetrics ? (
          <div className="grid grid-cols-2 gap-3 mt-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-accent-orange/20 rounded-lg flex items-center justify-center">
                <Flame className="w-5 h-5 text-accent-orange" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {globalMetrics.currentStreak}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Day Streak
                </p>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <Trophy className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {globalMetrics.longestStreak}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Best Streak
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Member since */}
        {memberSince ? (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm mt-3 flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 dark:bg-primary/20 rounded-lg flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                Member since
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {memberSince}
              </p>
            </div>
          </div>
        ) : null}

        {/* Reuse shared widgets */}
        {globalMetrics ? (
          <div className="mt-6">
            <StreakWidget
              currentStreak={globalMetrics.currentStreak}
              longestStreak={globalMetrics.longestStreak}
            />
          </div>
        ) : null}

        {prRecords.length > 0 ? (
          <div className="mt-6">
            <PersonalRecordsWidget records={prRecords} />
          </div>
        ) : null}

        <div className="mt-6">
          <WeekCalendarWidget
            completedDates={globalMetrics?.completedDates ?? []}
          />
        </div>

        <div className="mt-6">
          <RecentWorkoutsWidget
            workouts={recentWorkouts.slice(0, 5)}
            onSeeAll={() => navigate('/')}
            onWorkoutPress={(id) => navigate(`/workouts/${id}`)}
          />
        </div>

        {/* Logout */}
        <button
          type="button"
          onClick={() => onLogout()}
          className="w-full mt-6 py-3 px-4 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-5 h-5" />
          Log out
        </button>
      </div>

      <EditProfileSheet
        open={editOpen}
        onClose={() => setEditOpen(false)}
        profile={profile}
        onSaved={() => {
          invalidateProfile();
          setEditOpen(false);
        }}
      />
    </div>
  );
}
