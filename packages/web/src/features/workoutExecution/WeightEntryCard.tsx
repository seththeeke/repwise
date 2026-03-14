import { Dumbbell } from 'lucide-react';

const QUICK_ADD = [5, 10, 25, 45];

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

      <div className="flex gap-2 mt-4">
        {QUICK_ADD.map((w) => (
          <button
            key={w}
            type="button"
            onClick={() => onWeightChange((current + w).toString())}
            className="flex-1 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm font-medium text-white transition-colors"
          >
            +{w}
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
