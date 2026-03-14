import { useNavigate } from 'react-router-dom';
import { Avatar } from '@/components/ui/Avatar';

interface DashboardHeaderProps {
  displayName: string;
  profilePhoto?: string | null;
}

export function DashboardHeader({
  displayName,
  profilePhoto,
}: DashboardHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <p className="text-violet-200 text-sm">Welcome back</p>
        <h1 className="text-2xl font-bold text-white">{displayName}</h1>
      </div>
      <button
        type="button"
        onClick={() => navigate('/profile')}
        className="rounded-full focus:outline-none focus:ring-2 focus:ring-white/50"
        aria-label="Go to profile"
      >
        <Avatar
          src={profilePhoto}
          displayName={displayName}
          size="md"
          className="ring-2 ring-white/20"
        />
      </button>
    </div>
  );
}
