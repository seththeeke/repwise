interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: 'none' | 'sm' | 'md';
}

const paddingClasses = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
};

export function Card({
  children,
  className = '',
  padding = 'md',
}: CardProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 ${paddingClasses[padding]} ${className}`}
    >
      {children}
    </div>
  );
}
