import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ChevronLeft, Search, Plus } from 'lucide-react';
import { exercisesApi } from '@/api/exercises';
import { ExerciseDetailSheet } from './ExerciseDetailSheet';
import type { ExerciseCatalogItem } from '@/types';
import { ExerciseModality } from '@/types';
import { Spinner } from '@/components/ui/Spinner';

const MUSCLE_GROUPS = [
  'All',
  'chest',
  'back',
  'shoulders',
  'biceps',
  'triceps',
  'quadriceps',
  'hamstrings',
  'glutes',
  'core',
];

export function ExerciseCatalogPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<string | null>(null);
  const [selectedExerciseId, setSelectedExerciseId] = useState<string | null>(null);

  const { data: list = [], isLoading } = useQuery({
    queryKey: ['exercises', muscleGroup, searchQuery],
    queryFn: () =>
      exercisesApi.list({
        muscleGroup: muscleGroup && muscleGroup !== 'All' ? muscleGroup : undefined,
        search: searchQuery.trim() || undefined,
      }),
  });

  const exercises = Array.isArray(list) ? list : [];
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return exercises;
    const q = searchQuery.toLowerCase();
    return exercises.filter(
      (e: ExerciseCatalogItem) =>
        e.name?.toLowerCase().includes(q) ||
        (e.muscleGroups ?? []).some((m: string) => m.toLowerCase().includes(q))
    );
  }, [exercises, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="bg-gradient-to-b from-primary to-primary-dark px-4 pt-12 pb-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Exercises</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="px-4 -mt-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search exercises..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {MUSCLE_GROUPS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMuscleGroup(m === 'All' ? null : m)}
                className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap ${
                  (m === 'All' && !muscleGroup) || muscleGroup === m
                    ? 'bg-primary text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner />
          </div>
        ) : (
          <div className="space-y-2">
            {filtered.map((ex: ExerciseCatalogItem) => (
              <button
                key={ex.exerciseId}
                type="button"
                onClick={() => setSelectedExerciseId(ex.exerciseId)}
                className="w-full text-left p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-primary/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{ex.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {(ex.muscleGroups ?? []).join(', ')} ·{' '}
                      {ex.modality === ExerciseModality.DURATION
                        ? `${ex.defaultDurationSeconds ?? 60}s`
                        : `${ex.defaultSets ?? 3} × ${ex.defaultReps ?? 8}`}
                    </p>
                  </div>
                  <Plus className="w-5 h-5 text-gray-400 flex-shrink-0" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedExerciseId && (
        <ExerciseDetailSheet
          exerciseId={selectedExerciseId}
          onClose={() => setSelectedExerciseId(null)}
        />
      )}
    </div>
  );
}
