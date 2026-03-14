import { useState } from 'react';
import { Check, List, ArrowLeftRight, Trash2, Minus, Plus } from 'lucide-react';
import type { WorkoutExercise } from '@/types';
import { ExerciseModality } from '@/types';

interface ReviewExerciseRowProps {
  exercise: WorkoutExercise;
  index: number;
  selected: boolean;
  onToggleSelect: () => void;
  onUpdate: (updates: Partial<WorkoutExercise>) => void;
  onRemove: () => void;
  onSwap: () => void;
  swapMode: boolean;
  onCloseSwap: () => void;
  swapOptions: Array<{ exerciseId: string; name: string; muscleGroups: string[] }>;
  onChooseSwap: (exerciseId: string, name: string) => void;
}

export function ReviewExerciseRow({
  exercise,
  index,
  selected,
  onToggleSelect,
  onUpdate,
  onRemove,
  onSwap,
  swapMode,
  onCloseSwap,
  swapOptions,
  onChooseSwap,
}: ReviewExerciseRowProps) {
  const [editing, setEditing] = useState(false);

  if (swapMode) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-gray-900 dark:text-white">Swap with:</span>
          <button type="button" onClick={onCloseSwap} className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded">
            <span className="text-gray-500 text-lg">×</span>
          </button>
        </div>
        <div className="max-h-48 overflow-auto space-y-2">
          {swapOptions.map((ex) => (
            <button
              key={ex.exerciseId}
              type="button"
              onClick={() => onChooseSwap(ex.exerciseId, ex.name)}
              className="w-full text-left p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <p className="font-medium text-gray-900 dark:text-white text-sm">{ex.name}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{ex.muscleGroups.join(', ')}</p>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border transition-colors ${
        selected ? 'border-primary bg-primary/5 dark:bg-primary/10' : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-start gap-3">
        <button
          type="button"
          onClick={onToggleSelect}
          className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
            selected ? 'bg-primary border-primary' : 'border-gray-300 dark:border-gray-600'
          }`}
        >
          {selected && <Check className="w-4 h-4 text-white" />}
        </button>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white">{exercise.exerciseName}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {exercise.modality === ExerciseModality.DURATION
              ? `${exercise.durationSeconds ?? 0}s`
              : `${exercise.sets ?? 0} sets × ${exercise.reps ?? 0} reps`}
          </p>
        </div>
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => setEditing((e) => !e)}
            className={`p-2 rounded-lg transition-colors ${
              editing ? 'bg-primary/20 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500'
            }`}
            title="Edit sets/reps"
          >
            <List className="w-5 h-5" />
          </button>
          <button type="button" onClick={onSwap} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg" title="Swap">
            <ArrowLeftRight className="w-5 h-5 text-gray-500" />
          </button>
          <button type="button" onClick={onRemove} className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg" title="Remove">
            <Trash2 className="w-5 h-5 text-red-500" />
          </button>
        </div>
      </div>

      {editing && (
        <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 space-y-3">
          {exercise.modality === ExerciseModality.DURATION ? (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Duration</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onUpdate({ durationSeconds: Math.max(15, (exercise.durationSeconds ?? 60) - 15) })}
                  className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-16 text-center font-semibold">{exercise.durationSeconds ?? 60}s</span>
                <button
                  type="button"
                  onClick={() => onUpdate({ durationSeconds: (exercise.durationSeconds ?? 60) + 15 })}
                  className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Sets</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdate({ sets: Math.max(1, (exercise.sets ?? 3) - 1) })}
                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-semibold">{exercise.sets ?? 3}</span>
                  <button
                    type="button"
                    onClick={() => onUpdate({ sets: (exercise.sets ?? 3) + 1 })}
                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Reps</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onUpdate({ reps: Math.max(1, (exercise.reps ?? 8) - 1) })}
                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-8 text-center font-semibold">{exercise.reps ?? 8}</span>
                  <button
                    type="button"
                    onClick={() => onUpdate({ reps: (exercise.reps ?? 8) + 1 })}
                    className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </>
          )}
          <button type="button" onClick={() => setEditing(false)} className="w-full mt-3 py-2 text-sm text-primary font-medium">
            Done
          </button>
        </div>
      )}
    </div>
  );
}
