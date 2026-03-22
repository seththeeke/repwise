import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Plus, Check, List, X, Play } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useIsNativeApp } from '@/hooks/useIsNativeApp';
import { exercisesApi } from '@/api/exercises';
import { useWorkoutDraftStore } from '@/stores/workoutDraftStore';
import { WorkoutSource, PermissionType, ExerciseModality } from '@/types';
import type { ExerciseCatalogItem } from '@/types';

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 8;
const DEFAULT_DURATION = 60;

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

export function SelectExercisesScreen() {
  const navigate = useNavigate();
  const isNativeApp = useIsNativeApp();
  const draft = useWorkoutDraftStore((s) => s.draft);
  const setDraft = useWorkoutDraftStore((s) => s.setDraft);
  const updateExerciseInDraft = useWorkoutDraftStore((s) => s.updateExerciseInDraft);
  const removeExerciseFromDraft = useWorkoutDraftStore((s) => s.removeExerciseFromDraft);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const { data: exercisesList = [], isLoading } = useQuery({
    queryKey: ['exercises', selectedMuscleGroup, searchQuery],
    queryFn: () =>
      exercisesApi.list({
        muscleGroup: selectedMuscleGroup && selectedMuscleGroup !== 'All' ? selectedMuscleGroup : undefined,
        search: searchQuery.trim() || undefined,
      }),
  });

  const exercises = Array.isArray(exercisesList) ? exercisesList : [];
  const draftExercises = draft?.exercises ?? [];

  const filteredExercises = useMemo(() => {
    if (!searchQuery.trim()) return exercises;
    const q = searchQuery.toLowerCase();
    return exercises.filter(
      (e: ExerciseCatalogItem) =>
        e.name?.toLowerCase().includes(q) ||
        (e.muscleGroups ?? []).some((m: string) => m.toLowerCase().includes(q))
    );
  }, [exercises, searchQuery]);

  const addExercise = (ex: ExerciseCatalogItem) => {
    const workoutExercise = {
      exerciseId: ex.exerciseId,
      exerciseName: ex.name,
      modality: ex.modality,
      sets: ex.modality === ExerciseModality.DURATION ? undefined : (ex.defaultSets ?? DEFAULT_SETS),
      reps: ex.modality === ExerciseModality.DURATION ? undefined : (ex.defaultReps ?? DEFAULT_REPS),
      durationSeconds: ex.modality === ExerciseModality.DURATION ? (ex.defaultDurationSeconds ?? DEFAULT_DURATION) : undefined,
      skipped: false,
      orderIndex: draftExercises.length,
    };
    const newExercises = [...draftExercises, workoutExercise];
    setDraft({
      exercises: newExercises,
      source: WorkoutSource.MANUAL,
      permissionType: draft?.permissionType ?? PermissionType.FOLLOWERS_ONLY,
    });
  };

  const removeExercise = (index: number) => {
    removeExerciseFromDraft(index);
    setEditingIndex(null);
  };

  const handleStartWorkout = () => {
    if (draftExercises.length === 0) return;
    navigate('/workout/review');
  };

  const isSelected = (exerciseId: string) => draftExercises.some((e) => e.exerciseId === exerciseId);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {!isNativeApp && (
        <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            type="button"
            onClick={() => navigate('/workout/new')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Select Exercises</h1>
        </div>
      )}

      {isNativeApp && (
        <div className="p-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <button
            type="button"
            onClick={() => navigate('/workout/new')}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      )}

      <div className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exercises..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-transparent"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {MUSCLE_GROUPS.map((muscle) => (
            <button
              key={muscle}
              type="button"
              onClick={() => setSelectedMuscleGroup(muscle === 'All' ? null : muscle)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                (muscle === 'All' && !selectedMuscleGroup) || selectedMuscleGroup === muscle
                  ? 'bg-primary text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {muscle}
            </button>
          ))}
        </div>
      </div>

      {draftExercises.length > 0 && (
        <div className="p-4 bg-primary/5 dark:bg-primary/10 border-b border-primary/20">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-primary">Selected ({draftExercises.length})</span>
            <button
              type="button"
              onClick={() => setDraft({ ...draft!, exercises: [], source: WorkoutSource.MANUAL, permissionType: draft!.permissionType })}
              className="text-sm text-primary hover:underline"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-2">
            {draftExercises.map((ex, i) => (
              <div
                key={`${ex.exerciseId}-${i}`}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-primary/20"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{ex.exerciseName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {ex.modality === ExerciseModality.DURATION
                        ? `${ex.durationSeconds ?? 0}s`
                        : `${ex.sets ?? 0} × ${ex.reps ?? 0}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingIndex(editingIndex === i ? null : i)}
                      className={`p-1.5 rounded ${editingIndex === i ? 'bg-primary/20 text-primary' : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500'}`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button type="button" onClick={() => removeExercise(i)} className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded">
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
                {editingIndex === i && (
                  <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600 flex gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Sets</span>
                      <button
                        type="button"
                        onClick={() => updateExerciseInDraft(i, { sets: Math.max(1, (ex.sets ?? 3) - 1) })}
                        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-semibold">{ex.sets ?? 3}</span>
                      <button
                        type="button"
                        onClick={() => updateExerciseInDraft(i, { sets: (ex.sets ?? 3) + 1 })}
                        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-500">Reps</span>
                      <button
                        type="button"
                        onClick={() => updateExerciseInDraft(i, { reps: Math.max(1, (ex.reps ?? 8) - 1) })}
                        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                      >
                        −
                      </button>
                      <span className="w-8 text-center font-semibold">{ex.reps ?? 8}</span>
                      <button
                        type="button"
                        onClick={() => updateExerciseInDraft(i, { reps: (ex.reps ?? 8) + 1 })}
                        className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 pb-28">
        {isLoading ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">Loading exercises...</p>
        ) : (
          <div className="space-y-2">
            {filteredExercises.map((ex: ExerciseCatalogItem) => {
              const selected = isSelected(ex.exerciseId);
              return (
                <button
                  key={ex.exerciseId}
                  type="button"
                  onClick={() => !selected && addExercise(ex)}
                  disabled={selected}
                  className={`w-full text-left p-4 rounded-xl border transition-all ${
                    selected
                      ? 'bg-primary/10 border-primary/30 dark:border-primary/50'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-primary/50'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-900 dark:text-white">{ex.name}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {(ex.muscleGroups ?? []).join(', ')} ·{' '}
                        {ex.modality === ExerciseModality.DURATION
                          ? `${ex.defaultDurationSeconds ?? DEFAULT_DURATION}s`
                          : `${ex.defaultSets ?? DEFAULT_SETS} × ${ex.defaultReps ?? DEFAULT_REPS}`}
                      </p>
                    </div>
                    {selected ? <Check className="w-5 h-5 text-primary flex-shrink-0" /> : <Plus className="w-5 h-5 text-gray-400 flex-shrink-0" />}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Fixed Start Workout bar - always visible without scrolling */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur supports-[backdrop-filter]:bg-white dark:supports-[backdrop-filter]:bg-gray-800">
        <button
          type="button"
          onClick={handleStartWorkout}
          disabled={draftExercises.length === 0}
          className="w-full py-4 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          Start Workout ({draftExercises.length} exercises)
        </button>
      </div>
    </div>
  );
}