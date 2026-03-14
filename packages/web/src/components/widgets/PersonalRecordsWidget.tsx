import { Trophy, TrendingUp } from 'lucide-react';
import type { WeightUnit } from '@/types';

interface RecordItem {
  exerciseName: string;
  maxWeight: number;
  maxWeightUnit: WeightUnit;
  totalSessions: number;
  percentageChange?: number;
}

interface PersonalRecordsWidgetProps {
  records: RecordItem[];
  onExercisePress?: (exerciseId: string) => void;
}

export function PersonalRecordsWidget({
  records,
}: PersonalRecordsWidgetProps) {
  if (records.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <Trophy className="w-5 h-5 text-amber-500" />
        <h2 className="font-semibold text-gray-900 dark:text-white">
          Personal Records
        </h2>
      </div>
      <div className="space-y-3">
        {records.map((r, i) => (
          <div
            key={i}
            className="flex items-center justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0"
          >
            <div>
              <p className="font-medium text-gray-900 dark:text-white">
                {r.exerciseName}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {r.totalSessions} sessions
              </p>
            </div>
            <div className="text-right">
              <p className="font-bold text-gray-900 dark:text-white">
                {r.maxWeight} {r.maxWeightUnit === 'LBS' ? 'lbs' : 'kg'}
              </p>
              {r.percentageChange != null ? (
                <p
                  className={`text-xs flex items-center justify-end gap-1 ${
                    r.percentageChange >= 0
                      ? 'text-accent-green'
                      : 'text-red-500'
                  }`}
                >
                  <TrendingUp className="w-3 h-3" />
                  {r.percentageChange > 0 ? '+' : ''}
                  {r.percentageChange}%
                </p>
              ) : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
