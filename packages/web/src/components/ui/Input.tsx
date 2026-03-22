interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'maxLength'> {
  label?: string;
  error?: string;
  helperText?: string;
  maxLength?: number;
  showCharCount?: boolean;
}

export function Input({
  label,
  error,
  helperText,
  id,
  className = '',
  maxLength,
  showCharCount = false,
  value,
  ...props
}: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-');
  const strValue = typeof value === 'string' ? value : (value as number | undefined)?.toString() ?? '';
  const showCounter = (maxLength != null && showCharCount) || (maxLength != null && strValue.length > 0);
  const atLimit = maxLength != null && strValue.length >= maxLength;

  return (
    <div className="w-full">
      {label ? (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          {label}
        </label>
      ) : null}
      <input
        id={inputId}
        value={value}
        maxLength={maxLength}
        className={`w-full px-4 py-3 rounded-xl border bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-primary focus:border-transparent transition-all ${
          error
            ? 'border-red-500 focus:ring-red-500'
            : 'border-gray-300 dark:border-gray-600'
        } ${className}`}
        {...props}
      />
      {showCounter && (
        <p className={`mt-1 text-xs ${atLimit ? 'text-amber-600 dark:text-amber-400' : 'text-gray-500 dark:text-gray-400'}`}>
          {strValue.length} / {maxLength}
        </p>
      )}
      {error ? (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : helperText ? (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      ) : null}
    </div>
  );
}
