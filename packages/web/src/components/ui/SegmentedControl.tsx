interface Segment<T extends string> {
  value: T;
  label: string;
}

interface SegmentedControlProps<T extends string> {
  segments: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
}

export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  className = '',
}: SegmentedControlProps<T>) {
  return (
    <div
      className={`inline-flex p-1 rounded-xl bg-gray-100 dark:bg-gray-800 ${className}`}
      role="tablist"
    >
      {segments.map((seg) => (
        <button
          key={seg.value}
          type="button"
          role="tab"
          aria-selected={value === seg.value}
          onClick={() => onChange(seg.value)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            value === seg.value
              ? 'bg-white dark:bg-gray-700 text-primary shadow-sm dark:text-primary-light'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          {seg.label}
        </button>
      ))}
    </div>
  );
}
