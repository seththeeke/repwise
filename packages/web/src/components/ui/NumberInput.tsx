interface NumberInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  className?: string;
}

export function NumberInput({
  value,
  onChange,
  min = 0,
  max,
  step = 1,
  label,
  className = '',
}: NumberInputProps) {
  const handleIncrement = () => {
    const next = value + step;
    if (max == null || next <= max) onChange(next);
  };
  const handleDecrement = () => {
    const next = value - step;
    if (next >= min) onChange(next);
  };
  return (
    <div className={className}>
      {label ? (
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          {label}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={handleDecrement}
          disabled={value <= min}
          className="w-10 h-10 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          −
        </button>
        <span className="min-w-[3rem] text-center text-lg font-semibold text-gray-900 dark:text-white font-mono">
          {value}
        </span>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={max != null && value >= max}
          className="w-10 h-10 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 font-medium disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
        >
          +
        </button>
      </div>
    </div>
  );
}
