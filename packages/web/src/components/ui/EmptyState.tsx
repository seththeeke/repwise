interface EmptyStateProps {
  icon: React.ReactNode;
  heading: string;
  subtext?: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  icon,
  heading,
  subtext,
  action,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      <div className="w-14 h-14 rounded-2xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500 mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
        {heading}
      </h3>
      {subtext ? (
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-xs mb-4">
          {subtext}
        </p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
