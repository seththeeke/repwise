/** Single row: −5, +5, +10, +25, +45 */
const QUICK_ADJUST: { label: string; delta: number }[] = [
  { label: '−5', delta: -5 },
  { label: '+5', delta: 5 },
  { label: '+10', delta: 10 },
  { label: '+25', delta: 25 },
  { label: '+45', delta: 45 },
];

interface WeightEntryCardProps {
  weight: string;
  onWeightChange: (value: string) => void;
  lastUsedWeight?: number;
  lastPerformedDate?: string;
  weightUnit?: string;
  sets?: number;
  reps?: number;
  onUsePrevious: () => void;
}

function formatRelative(dateStr?: string): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'today';
  if (diffDays === 1) return 'yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  return d.toLocaleDateString();
}

export function WeightEntryCard({
  weight,
  onWeightChange,
  lastUsedWeight,
  lastPerformedDate,
  weightUnit = 'lbs',
  sets,
  reps,
  onUsePrevious,
}: WeightEntryCardProps) {
  const current = parseFloat(weight) || 0;

  return (
    <div className="w-full max-w-xs mx-auto">
      <div className="bg-gray-800 rounded-2xl p-6">
        <label className="block text-sm text-gray-400 mb-2 text-center">
          Weight ({weightUnit})
        </label>
        <input
          type="number"
          inputMode="decimal"
          value={weight}
          onChange={(e) => onWeightChange(e.target.value)}
          placeholder={lastUsedWeight?.toString() ?? '0'}
          className="w-full text-center text-5xl font-bold bg-transparent border-none outline-none focus:ring-0 text-white placeholder-gray-500"
        />
      </div>

      <div className="grid grid-cols-5 gap-1.5 mt-4">
        {QUICK_ADJUST.map(({ label, delta }) => (
          <button
            key={label}
            type="button"
            onClick={() =>
              onWeightChange(Math.max(0, current + delta).toString())
            }
            className="py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-xs sm:text-sm font-medium text-white transition-colors"
          >
            {label}
          </button>
        ))}
      </div>

      {lastUsedWeight != null && (
        <button
          type="button"
          onClick={onUsePrevious}
          className="w-full mt-3 py-2 text-primary hover:text-primary-light text-sm font-medium transition-colors"
        >
          Use previous weight ({lastUsedWeight} {weightUnit}
          {sets != null && reps != null ? ` · ${sets}×${reps}` : ''}
          {lastPerformedDate ? ` · ${formatRelative(lastPerformedDate)}` : ''})
        </button>
      )}
    </div>
  );
}
