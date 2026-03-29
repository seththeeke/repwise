import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Sparkles, Play, RefreshCw, GripVertical, Building2, List } from 'lucide-react';
import { useIsNativeApp } from '@/hooks/useIsNativeApp';
import { useWorkoutDraftStore } from '@/stores/workoutDraftStore';
import { useWorkoutSessionStore } from '@/stores/workoutSessionStore';
import { workoutsApi } from '@/api/workouts';
import { gymsApi } from '@/api/gyms';
import { streamWorkoutRegenerate, type ProgressStep } from '@/api/aiWorkoutStream';
import { WorkoutSource, PermissionType } from '@/types';
import { ReviewExerciseRow } from './ReviewExerciseRow';
import { exercisesApi } from '@/api/exercises';
import { useQuery } from '@tanstack/react-query';

export function ReviewWorkoutScreen() {
  const navigate = useNavigate();
  const isNativeApp = useIsNativeApp();
  const draft = useWorkoutDraftStore((s) => s.draft);
  const setDraft = useWorkoutDraftStore((s) => s.setDraft);
  const updateExerciseInDraft = useWorkoutDraftStore((s) => s.updateExerciseInDraft);
  const removeExerciseFromDraft = useWorkoutDraftStore((s) => s.removeExerciseFromDraft);
  const reorderExercisesInDraft = useWorkoutDraftStore((s) => s.reorderExercisesInDraft);
  const clearDraft = useWorkoutDraftStore((s) => s.clearDraft);
  const startSession = useWorkoutSessionStore((s) => s.startSession);

  const [swapIndex, setSwapIndex] = useState<number | null>(null);
  const [starting, setStarting] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [regenerating, setRegenerating] = useState(false);
  const [regenerateProgress, setRegenerateProgress] = useState<ProgressStep | null>(null);
  const [regenerateError, setRegenerateError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);
  const touchDragRef = useRef<{ index: number; startY: number } | null>(null);
  const dropIndexRef = useRef<number | null>(null);
  dropIndexRef.current = dropIndex;

  const exercises = draft?.exercises ?? [];
  const isAI = draft?.source === WorkoutSource.AI_GENERATED;
  const { data: catalogExercises = [] } = useQuery({
    queryKey: ['exercises'],
    queryFn: () => exercisesApi.list({}),
    enabled: swapIndex !== null || isAI,
  });
  const { data: gymsData } = useQuery({
    queryKey: ['gyms'],
    queryFn: () => gymsApi.list(),
    enabled: !!draft && exercises.length > 0,
  });
  const gyms = gymsData?.gyms ?? [];
  const defaultGymId = gymsData?.defaultGymId ?? null;

  useEffect(() => {
    if (!draft || gyms.length === 0) return;
    if (draft.selectedGym != null) return;
    const defaultGym = gyms.find((g) => g.gymId === defaultGymId) ?? gyms[0];
    if (defaultGym) {
      setDraft({
        ...draft,
        selectedGym: {
          gymId: defaultGym.gymId,
          name: defaultGym.name,
          equipmentTypes: defaultGym.equipmentTypes ?? [],
        },
      });
    }
  }, [draft, gyms, defaultGymId, setDraft]);

  const toggleSelect = (index: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
    setRegenerateError(null);
  };

  const handleRegenerate = async () => {
    if (selectedIndices.size === 0 || !draft) return;
    const catalog = Array.isArray(catalogExercises) ? catalogExercises : [];
    const indices = Array.from(selectedIndices).sort((a, b) => a - b);

    const targetMuscleGroups = indices.map((i) => {
      const ex = exercises[i];
      const catalogItem = catalog.find(
        (c: { exerciseId: string }) => c.exerciseId === ex?.exerciseId
      ) as { muscleGroup?: string } | undefined;
      return catalogItem?.muscleGroup ?? 'full';
    });

    const userPrompt = draft.aiPrompt ?? '';
    const equipmentTypes = draft.selectedGym?.equipmentTypes ?? undefined;
    setRegenerating(true);
    setRegenerateError(null);
    setRegenerateProgress(null);
    await streamWorkoutRegenerate(
      {
        exerciseIndices: indices,
        currentExerciseIds: exercises.map((e) => e.exerciseId),
        targetMuscleGroups,
        userPrompt,
        equipmentTypes,
      },
      exercises,
      {
        onProgress: (step) => setRegenerateProgress(step),
        onComplete: (updated) => {
          setDraft({ ...draft, exercises: updated });
          setSelectedIndices(new Set());
          setRegenerating(false);
          setRegenerateProgress(null);
        },
        onError: (msg) => {
          setRegenerateError(msg);
          setRegenerating(false);
          setRegenerateProgress(null);
        },
      },
      { builderSessionId: draft.builderSessionId ?? undefined }
    );
  };

  // Don't redirect to builder when we're in the middle of starting (clearDraft causes empty draft before navigate completes)
  if (!draft || exercises.length === 0) {
    if (!starting) navigate('/workout/new');
    return null;
  }

  const swapOptions = Array.isArray(catalogExercises)
    ? catalogExercises.filter((c) => !exercises.some((e) => e.exerciseId === c.exerciseId))
    : [];

  const handleEditInManualBuilder = () => {
    if (!draft || exercises.length === 0) return;
    const reordered = exercises.map((ex, i) => ({ ...ex, orderIndex: i }));
    setDraft({
      ...draft,
      source: WorkoutSource.MANUAL,
      exercises: reordered,
    });
    navigate('/workout/new/manual');
  };

  const handleStartWorkout = async () => {
    setStarting(true);
    try {
      const created = await workoutsApi.create({
        exercises,
        source: draft.source === WorkoutSource.AI_GENERATED ? WorkoutSource.AI_GENERATED : WorkoutSource.MANUAL,
        permissionType: draft.permissionType ?? PermissionType.FOLLOWERS_ONLY,
        ...(draft.selectedGym && { gymId: draft.selectedGym.gymId, gymName: draft.selectedGym.name }),
      });
      startSession(created.workoutInstanceId, created.exercises);
      clearDraft();
      navigate(`/workout/execute/${created.workoutInstanceId}`);
    } catch {
      setStarting(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('text/plain', String(index));
    e.dataTransfer.effectAllowed = 'move';
    setDragIndex(index);
  };
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropIndex(index);
  };
  const handleDragLeave = () => {
    setDropIndex(null);
  };
  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault();
    setDropIndex(null);
    const fromIndex = dragIndex ?? (e.dataTransfer.getData('text/plain') ? parseInt(e.dataTransfer.getData('text/plain'), 10) : null);
    if (fromIndex == null || Number.isNaN(fromIndex) || fromIndex === toIndex) {
      setDragIndex(null);
      return;
    }
    reorderExercisesInDraft(fromIndex, toIndex);
    setDragIndex(null);
  };
  const handleDragEnd = () => {
    setDragIndex(null);
    setDropIndex(null);
  };

  const handleTouchStart = (_e: React.TouchEvent, index: number) => {
    touchDragRef.current = { index, startY: 0 };
    setDragIndex(index);
    setDropIndex(index);
  };
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!touchDragRef.current || !e.touches[0]) return;
    const touch = e.touches[0];
    const els = document.elementsFromPoint(touch.clientX, touch.clientY);
    for (const el of els) {
      const rowIndex = el.getAttribute('data-row-index');
      if (rowIndex != null) {
        const i = parseInt(rowIndex, 10);
        if (!Number.isNaN(i)) setDropIndex(i);
        break;
      }
    }
  }, []);
  const handleTouchEnd = useCallback(() => {
    const from = touchDragRef.current?.index;
    const to = dropIndexRef.current;
    if (from != null && to != null && from !== to) {
      reorderExercisesInDraft(from, to);
    }
    touchDragRef.current = null;
    setDragIndex(null);
    setDropIndex(null);
  }, [reorderExercisesInDraft]);

  useEffect(() => {
    if (dragIndex === null) return;
    document.addEventListener('touchmove', handleTouchMove, { passive: true });
    document.addEventListener('touchend', handleTouchEnd, { once: true });
    document.addEventListener('touchcancel', handleTouchEnd, { once: true });
    return () => {
      document.removeEventListener('touchmove', handleTouchMove);
      document.removeEventListener('touchend', handleTouchEnd);
      document.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [dragIndex, handleTouchMove, handleTouchEnd]);

  const handleChooseSwap = (exerciseId: string, name: string) => {
    if (swapIndex === null) return;
    const ex = Array.isArray(catalogExercises)
      ? (catalogExercises as Array<{ exerciseId: string; modality: string; defaultSets?: number; defaultReps?: number; defaultDurationSeconds?: number }>).find(
          (c) => c.exerciseId === exerciseId
        )
      : null;
    const modality = ex?.modality ?? 'sets_reps';
    const newEx = {
      exerciseId,
      exerciseName: name,
      modality: modality as 'sets_reps' | 'duration' | 'burnout',
      sets: modality === 'duration' ? undefined : (ex?.defaultSets ?? 3),
      reps: modality === 'duration' ? undefined : (ex?.defaultReps ?? 8),
      durationSeconds: modality === 'duration' ? (ex?.defaultDurationSeconds ?? 60) : undefined,
      skipped: false,
      orderIndex: swapIndex,
    };
    updateExerciseInDraft(swapIndex, newEx);
    setSwapIndex(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {!isNativeApp && (
        <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <button
            type="button"
            onClick={() => navigate(isAI ? '/workout/new/ai' : '/workout/new/manual')}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Review Workout</h1>
        </div>
      )}

      {isNativeApp && (
        <div className="p-4" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))' }}>
          <button
            type="button"
            onClick={() => navigate(isAI ? '/workout/new/ai' : '/workout/new/manual')}
            className="p-2 -ml-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
      )}

      {gyms.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center gap-2">
          <Building2 className="w-5 h-5 text-gray-500 dark:text-gray-400" />
          <label htmlFor="gym-select" className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Gym
          </label>
          <select
            id="gym-select"
            value={draft?.selectedGym?.gymId ?? ''}
            onChange={(e) => {
              const gym = gyms.find((g) => g.gymId === e.target.value);
              if (gym && draft) {
                setDraft({
                  ...draft,
                  selectedGym: {
                    gymId: gym.gymId,
                    name: gym.name,
                    equipmentTypes: gym.equipmentTypes ?? [],
                  },
                });
              }
            }}
            className="flex-1 min-w-0 py-2 px-3 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
          >
            {gyms.map((g) => (
              <option key={g.gymId} value={g.gymId}>
                {g.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {isAI && (
        <div className="p-4 bg-gradient-to-r from-primary to-primary-dark">
          <div className="flex items-center gap-2 text-white mb-1">
            <Sparkles className="w-4 h-4" />
            <span className="text-sm font-medium">AI Generated Workout</span>
          </div>
          <p className="text-violet-200 text-sm">Select exercises to regenerate, or edit/remove, then start.</p>
          {selectedIndices.size > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={regenerating}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/20 hover:bg-white/30 text-white text-sm font-medium disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
                {regenerating ? (regenerateProgress ? `Regenerating… (${regenerateProgress.replace(/_/g, ' ')})` : 'Regenerating…') : `Regenerate ${selectedIndices.size} selected`}
              </button>
              <button
                type="button"
                onClick={() => setSelectedIndices(new Set())}
                disabled={regenerating}
                className="text-white/90 hover:text-white text-sm"
              >
                Clear selection
              </button>
            </div>
          )}
          {regenerateError && (
            <p className="mt-2 text-red-200 text-sm">{regenerateError}</p>
          )}
        </div>
      )}

      <div className="flex-1 overflow-auto p-4 pb-40 space-y-3">
        {exercises.map((exercise, index) => (
          <div
            key={`${exercise.exerciseId}-${index}`}
            data-row-index={index}
            onDragOver={(e) => handleDragOver(e, index)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, index)}
            className={`rounded-xl transition-colors ${
              dragIndex === index ? 'opacity-50' : ''
            } ${dropIndex === index && dragIndex !== index ? 'ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900' : ''}`}
          >
            <div className="flex items-stretch gap-1">
              <div
                role="button"
                tabIndex={0}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragEnd={handleDragEnd}
                onTouchStart={(e) => handleTouchStart(e, index)}
                className="flex items-center justify-center w-10 min-h-[44px] flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 touch-manipulation"
                aria-label="Drag to reorder"
              >
                <GripVertical className="w-5 h-5 pointer-events-none" />
              </div>
              <div className="flex-1 min-w-0">
                <ReviewExerciseRow
                  exercise={exercise}
                  index={index}
                  selected={selectedIndices.has(index)}
                  onToggleSelect={() => toggleSelect(index)}
                  onUpdate={(updates) => updateExerciseInDraft(index, updates)}
                  onRemove={() => removeExerciseFromDraft(index)}
                  onSwap={() => setSwapIndex(index)}
                  swapMode={swapIndex === index}
                  onCloseSwap={() => setSwapIndex(null)}
                  swapOptions={swapOptions.map((c: { exerciseId: string; name: string; muscleGroups: string[] }) => ({
                    exerciseId: c.exerciseId,
                    name: c.name,
                    muscleGroups: c.muscleGroups ?? [],
                  }))}
                  onChooseSwap={handleChooseSwap}
                />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fixed actions: manual builder + Start Workout */}
      <div className="fixed bottom-0 left-0 right-0 p-4 border-t border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur supports-[backdrop-filter]:bg-white dark:supports-[backdrop-filter]:bg-gray-800 space-y-2 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <button
          type="button"
          onClick={handleEditInManualBuilder}
          disabled={starting || exercises.length === 0}
          className="w-full py-3 border-2 border-primary/40 dark:border-primary/50 text-primary font-semibold rounded-xl hover:bg-primary/5 dark:hover:bg-primary/10 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
        >
          <List className="w-5 h-5" />
          Edit in manual builder
        </button>
        <button
          type="button"
          onClick={handleStartWorkout}
          disabled={starting || exercises.length === 0}
          className="w-full py-4 bg-primary hover:bg-primary-dark disabled:opacity-50 text-white font-semibold rounded-xl shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          {starting ? 'Starting...' : `Start Workout (${exercises.length} exercises)`}
        </button>
      </div>
    </div>
  );
}
