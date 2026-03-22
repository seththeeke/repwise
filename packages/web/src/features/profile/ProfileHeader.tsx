import { useNavigate } from 'react-router-dom';
import { LogOut, Edit2 } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { useIsNativeApp } from '@/hooks/useIsNativeApp';
import type { UserProfile } from '@/types';

interface ProfileHeaderProps {
  profile: UserProfile;
  onEditClick: () => void;
  onLogout: () => void;
}

export function ProfileHeader({ profile, onEditClick, onLogout }: ProfileHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-gradient-to-b from-primary to-primary-dark px-4 pt-12 pb-24">
      <div className="flex items-center justify-between mb-6">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Back"
        >
          <span className="text-white text-lg leading-none">←</span>
        </button>
        <h1 className="text-lg font-semibold text-white">Profile</h1>
        <button
          type="button"
          onClick={onLogout}
          className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          aria-label="Log out"
        >
          <LogOut className="w-5 h-5 text-white" />
        </button>
      </div>
    </div>
  );
}

export function ProfileCard({
  profile,
  onEditClick,
}: ProfileHeaderProps) {
  const isNativeApp = useIsNativeApp();
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-lg -mt-16 mx-4 relative z-10">
      <div className="flex items-start gap-4">
        <Avatar
          src={profile.profilePhoto}
          displayName={profile.displayName}
          size="lg"
          className="w-20 h-20 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white truncate">
              {profile.displayName}
            </h2>
            <button
              type="button"
              onClick={onEditClick}
              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex-shrink-0"
              aria-label="Edit profile"
            >
              <Edit2 className="w-4 h-4 text-gray-400" />
            </button>
          </div>
          <p className={`text-gray-500 dark:text-gray-400 ${isNativeApp ? 'truncate' : ''}`}>@{profile.username}</p>
          {profile.bio ? (
            <p className="text-gray-700 dark:text-gray-300 mt-2 text-sm">
              {profile.bio}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
