type BadgeVariant = 'purple' | 'green' | 'orange' | 'gray';

const variantClasses: Record<BadgeVariant, string> = {
  purple: 'bg-primary/10 text-primary dark:bg-primary/20',
  green: 'bg-accent-green/10 text-accent-green dark:bg-accent-green/20',
  orange: 'bg-accent-orange/10 text-accent-orange dark:bg-accent-orange/20',
  gray: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
};

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  className?: string;
}

export function Badge({
  children,
  variant = 'gray',
  className = '',
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${variantClasses[variant]} ${className}`}
    >
      {children}
    </span>
  );
}
