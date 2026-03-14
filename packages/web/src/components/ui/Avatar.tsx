type AvatarSize = 'sm' | 'md' | 'lg';

const sizeClasses: Record<AvatarSize, string> = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
};

interface AvatarProps {
  src?: string | null;
  displayName: string;
  size?: AvatarSize;
  className?: string;
}

function getInitials(displayName: string): string {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return displayName.slice(0, 2).toUpperCase();
}

export function Avatar({
  src,
  displayName,
  size = 'md',
  className = '',
}: AvatarProps) {
  const initials = getInitials(displayName || '?');
  return (
    <div
      className={`rounded-full flex items-center justify-center font-semibold text-white bg-gradient-to-br from-primary to-primary-dark flex-shrink-0 overflow-hidden ${sizeClasses[size]} ${className}`}
    >
      {src ? (
        <img
          src={src}
          alt=""
          className="w-full h-full object-cover"
        />
      ) : (
        initials
      )}
    </div>
  );
}
