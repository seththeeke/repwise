import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkout } from '../context/WorkoutContext';
import { mockExercises, muscleGroups } from '../data/mockData';
import { type WorkoutExercise, ExerciseModality, type Exercise, WorkoutSource } from '../types/index';
import {
  ArrowLeft,
  Wand2,
  Plus,
  Search,
  X,
  Check,
  Trash2,
  RefreshCw,
  Play,
  Loader2,
  Sparkles,
  GripVertical,
  Minus,
  List,
} from 'lucide-react';

type Mode = 'select' | 'manual' | 'ai-prompt' | 'ai-generating' | 'ai-review';

const AI_PROGRESS_STEPS = [
  { id: 'analyzing', message: 'Analyzing your fitness goals...' },
  { id: 'scanning', message: 'Scanning exercise catalog...' },
  { id: 'reviewing', message: 'Reviewing your recent workouts...' },
  { id: 'balancing', message: 'Balancing muscle groups...' },
  { id: 'optimizing', message: 'Optimizing workout structure...' },
  { id: 'complete', message: 'Workout ready!' },
];

const DEFAULT_SETS = 3;
const DEFAULT_REPS = 8;
const DEFAULT_DURATION = 60;

export default function CreateWorkoutPage() {
  const navigate = useNavigate();
  const { draftExercises, setDraftExercises, startWorkout } = useWorkout();
  const [mode, setMode] = useState<Mode>('select');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState<string | null>(null);
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiProgressStep, setAiProgressStep] = useState(0);
  const [selectedForRegenerate, setSelectedForRegenerate] = useState<Set<number>>(new Set());
  const [showManualSwap, setShowManualSwap] = useState<number | null>(null);
  const [editingExercise, setEditingExercise] = useState<number | null>(null);

  const filteredExercises = mockExercises.filter((ex) => {
    const matchesSearch = ex.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesMuscle = !selectedMuscleGroup || ex.muscleGroups.includes(selectedMuscleGroup);
    return matchesSearch && matchesMuscle;
  });

  const addExercise = (exercise: Exercise) => {
    const workoutExercise: WorkoutExercise = {
      exerciseId: exercise.exerciseId,
      exerciseName: exercise.name,
      modality: exercise.modality,
      sets: exercise.modality === ExerciseModality.DURATION ? undefined : (exercise.defaultSets || DEFAULT_SETS),
      reps: exercise.modality === ExerciseModality.DURATION ? undefined : (exercise.defaultReps || DEFAULT_REPS),
      durationSeconds: exercise.modality === ExerciseModality.DURATION ? (exercise.defaultDurationSeconds || DEFAULT_DURATION) : undefined,
      skipped: false,
      orderIndex: draftExercises.length,
    };
    setDraftExercises([...draftExercises, workoutExercise]);
  };

  const removeExercise = (index: number) => {
    const updated = draftExercises.filter((_, i) => i !== index);
    setDraftExercises(updated.map((e, i) => ({ ...e, orderIndex: i })));
    setSelectedForRegenerate((prev) => {
      const newSet = new Set<number>();
      prev.forEach((i) => {
        if (i < index) newSet.add(i);
        else if (i > index) newSet.add(i - 1);
      });
      return newSet;
    });
  };

  const updateExerciseConfig = (index: number, updates: Partial<WorkoutExercise>) => {
    const updated = [...draftExercises];
    updated[index] = { ...updated[index], ...updates };
    setDraftExercises(updated);
  };

  const swapExercise = (index: number, newExercise: Exercise) => {
    const updated = [...draftExercises];
    updated[index] = {
      exerciseId: newExercise.exerciseId,
      exerciseName: newExercise.name,
      modality: newExercise.modality,
      sets: newExercise.modality === ExerciseModality.DURATION ? undefined : (newExercise.defaultSets || DEFAULT_SETS),
      reps: newExercise.modality === ExerciseModality.DURATION ? undefined : (newExercise.defaultReps || DEFAULT_REPS),
      durationSeconds: newExercise.modality === ExerciseModality.DURATION ? (newExercise.defaultDurationSeconds || DEFAULT_DURATION) : undefined,
      skipped: false,
      orderIndex: index,
    };
    setDraftExercises(updated);
    setShowManualSwap(null);
  };

  const toggleRegenerateSelection = (index: number) => {
    setSelectedForRegenerate((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(index)) {
        newSet.delete(index);
      } else {
        newSet.add(index);
      }
      return newSet;
    });
  };

  const generateAIWorkout = async (regenerateIndices?: Set<number>) => {
    setMode('ai-generating');
    setAiProgressStep(0);

    for (let i = 0; i < AI_PROGRESS_STEPS.length; i++) {
      await new Promise((resolve) => setTimeout(resolve, 600 + Math.random() * 400));
      setAiProgressStep(i);
    }

    const promptLower = aiPrompt.toLowerCase();
    let selectedExercises: Exercise[] = [];

    if (promptLower.includes('chest') || promptLower.includes('push')) {
      selectedExercises = mockExercises.filter(
        (e) => e.muscleGroups.includes('chest') || e.muscleGroups.includes('triceps') || e.muscleGroups.includes('shoulders')
      );
    } else if (promptLower.includes('back') || promptLower.includes('pull')) {
      selectedExercises = mockExercises.filter(
        (e) => e.muscleGroups.includes('back') || e.muscleGroups.includes('biceps')
      );
    } else if (promptLower.includes('leg') || promptLower.includes('lower')) {
      selectedExercises = mockExercises.filter(
        (e) => e.muscleGroups.includes('quadriceps') || e.muscleGroups.includes('hamstrings') || e.muscleGroups.includes('glutes')
      );
    } else {
      selectedExercises = [...mockExercises].sort(() => Math.random() - 0.5);
    }

    if (regenerateIndices && regenerateIndices.size > 0) {
      const currentExerciseIds = new Set(draftExercises.map((e) => e.exerciseId));
      const availableExercises = selectedExercises.filter((e) => !currentExerciseIds.has(e.exerciseId));
      
      const updatedExercises = [...draftExercises];
      const indicesToReplace = Array.from(regenerateIndices);
      
      indicesToReplace.forEach((index, i) => {
        if (availableExercises[i]) {
          const ex = availableExercises[i];
          updatedExercises[index] = {
            exerciseId: ex.exerciseId,
            exerciseName: ex.name,
            modality: ex.modality,
            sets: ex.modality === ExerciseModality.DURATION ? undefined : (ex.defaultSets || DEFAULT_SETS),
            reps: ex.modality === ExerciseModality.DURATION ? undefined : (ex.defaultReps || DEFAULT_REPS),
            durationSeconds: ex.modality === ExerciseModality.DURATION ? (ex.defaultDurationSeconds || DEFAULT_DURATION) : undefined,
            skipped: false,
            orderIndex: index,
          };
        }
      });
      
      setDraftExercises(updatedExercises);
      setSelectedForRegenerate(new Set());
    } else {
      const workoutExercises: WorkoutExercise[] = selectedExercises.slice(0, 5).map((ex, i) => ({
        exerciseId: ex.exerciseId,
        exerciseName: ex.name,
        modality: ex.modality,
        sets: ex.modality === ExerciseModality.DURATION ? undefined : (ex.defaultSets || DEFAULT_SETS),
        reps: ex.modality === ExerciseModality.DURATION ? undefined : (ex.defaultReps || DEFAULT_REPS),
        durationSeconds: ex.modality === ExerciseModality.DURATION ? (ex.defaultDurationSeconds || DEFAULT_DURATION) : undefined,
        skipped: false,
        orderIndex: i,
      }));

      setDraftExercises(workoutExercises);
    }
    
    setMode('ai-review');
  };

  const handleStartWorkout = () => {
    const source = mode === 'ai-review' ? WorkoutSource.AI_GENERATED : WorkoutSource.MANUAL;
    startWorkout(draftExercises, source);
    navigate('/workout/active');
  };

  const renderModeSelect = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Create Workout</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-8 text-center">How would you like to build your workout?</p>

      <div className="w-full max-w-sm space-y-4">
        <button
          onClick={() => setMode('ai-prompt')}
          className="w-full p-6 bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl shadow-lg shadow-violet-500/30 text-left hover:scale-[1.02] transition-transform"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-lg">AI Generate</h3>
              <p className="text-violet-200 text-sm">Let AI create your perfect workout</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => setMode('manual')}
          className="w-full p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 text-left hover:border-violet-300 dark:hover:border-violet-700 transition-colors"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
              <Plus className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white text-lg">Manual Build</h3>
              <p className="text-gray-500 dark:text-gray-400 text-sm">Pick exercises yourself</p>
            </div>
          </div>
        </button>
      </div>
    </div>
  );

  const renderAIPrompt = () => (
    <div className="flex-1 flex flex-col p-4">
      <div className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full">
        <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-violet-500/30">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2 text-center">What would you like to train?</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-6 text-center text-sm">
          Describe your goals, target muscles, or how much time you have
        </p>

        <textarea
          value={aiPrompt}
          onChange={(e) => setAiPrompt(e.target.value)}
          placeholder="e.g., 45 minute upper body push workout focusing on chest and shoulders..."
          className="w-full h-32 p-4 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />

        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          {['Push day', 'Pull day', 'Leg day', 'Full body', '30 min quick'].map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => setAiPrompt(suggestion)}
              className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-violet-100 dark:hover:bg-violet-900/30 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => generateAIWorkout()}
        disabled={!aiPrompt.trim()}
        className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/30 disabled:shadow-none transition-all flex items-center justify-center gap-2"
      >
        <Wand2 className="w-5 h-5" />
        Generate Workout
      </button>
    </div>
  );

  const renderAIGenerating = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6">
      <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-violet-500/30 animate-pulse">
        <Wand2 className="w-10 h-10 text-white" />
      </div>

      <div className="w-full max-w-sm space-y-3">
        {AI_PROGRESS_STEPS.map((step, i) => (
          <div
            key={step.id}
            className={`flex items-center gap-3 p-3 rounded-lg transition-all ${
              i < aiProgressStep
                ? 'bg-green-50 dark:bg-green-900/20'
                : i === aiProgressStep
                ? 'bg-violet-50 dark:bg-violet-900/20'
                : 'bg-gray-50 dark:bg-gray-800'
            }`}
          >
            <div
              className={`w-6 h-6 rounded-full flex items-center justify-center ${
                i < aiProgressStep
                  ? 'bg-green-500'
                  : i === aiProgressStep
                  ? 'bg-violet-500'
                  : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              {i < aiProgressStep ? (
                <Check className="w-4 h-4 text-white" />
              ) : i === aiProgressStep ? (
                <Loader2 className="w-4 h-4 text-white animate-spin" />
              ) : (
                <span className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full" />
              )}
            </div>
            <span
              className={`text-sm ${
                i <= aiProgressStep ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {step.message}
            </span>
          </div>
        ))}
      </div>
    </div>
  );

  const renderExerciseEditor = (exercise: WorkoutExercise, index: number) => (
    <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
      {exercise.modality === ExerciseModality.DURATION ? (
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">Duration</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateExerciseConfig(index, { durationSeconds: Math.max(15, (exercise.durationSeconds || 60) - 15) })}
              className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="w-16 text-center font-semibold">{exercise.durationSeconds}s</span>
            <button
              onClick={() => updateExerciseConfig(index, { durationSeconds: (exercise.durationSeconds || 60) + 15 })}
              className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Sets</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateExerciseConfig(index, { sets: Math.max(1, (exercise.sets || 3) - 1) })}
                className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-semibold">{exercise.sets}</span>
              <button
                onClick={() => updateExerciseConfig(index, { sets: (exercise.sets || 3) + 1 })}
                className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Reps</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateExerciseConfig(index, { reps: Math.max(1, (exercise.reps || 8) - 1) })}
                className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Minus className="w-4 h-4" />
              </button>
              <span className="w-8 text-center font-semibold">{exercise.reps}</span>
              <button
                onClick={() => updateExerciseConfig(index, { reps: (exercise.reps || 8) + 1 })}
                className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center hover:bg-gray-200 dark:hover:bg-gray-600"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      <button
        onClick={() => setEditingExercise(null)}
        className="w-full mt-3 py-2 text-sm text-violet-600 dark:text-violet-400 font-medium"
      >
        Done
      </button>
    </div>
  );

  const renderAIReview = () => (
    <div className="flex-1 flex flex-col">
      <div className="p-4 bg-gradient-to-r from-violet-500 to-purple-600">
        <div className="flex items-center gap-2 text-white mb-1">
          <Sparkles className="w-4 h-4" />
          <span className="text-sm font-medium">AI Generated Workout</span>
        </div>
        <p className="text-violet-200 text-sm">Select exercises to regenerate, or manually swap individual ones.</p>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-3">
          {draftExercises.map((exercise, index) => (
            <div
              key={`${exercise.exerciseId}-${index}`}
              className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border transition-colors ${
                selectedForRegenerate.has(index)
                  ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              {showManualSwap === index ? (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Swap with:</span>
                    <button
                      onClick={() => setShowManualSwap(null)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                    >
                      <X className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                  <div className="max-h-48 overflow-auto space-y-2">
                    {mockExercises
                      .filter((e) => !draftExercises.find((d) => d.exerciseId === e.exerciseId))
                      .map((ex) => (
                        <button
                          key={ex.exerciseId}
                          onClick={() => swapExercise(index, ex)}
                          className="w-full text-left p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        >
                          <p className="font-medium text-gray-900 dark:text-white text-sm">{ex.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {ex.muscleGroups.join(', ')}
                          </p>
                        </button>
                      ))}
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start gap-3">
                    <button
                      onClick={() => toggleRegenerateSelection(index)}
                      className={`w-6 h-6 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                        selectedForRegenerate.has(index)
                          ? 'bg-violet-500 border-violet-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    >
                      {selectedForRegenerate.has(index) && <Check className="w-4 h-4 text-white" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{exercise.exerciseName}</h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {exercise.modality === ExerciseModality.DURATION
                          ? `${exercise.durationSeconds}s`
                          : `${exercise.sets} sets × ${exercise.reps} reps`}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => setEditingExercise(editingExercise === index ? null : index)}
                        className={`p-2 rounded-lg transition-colors ${
                          editingExercise === index
                            ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400'
                        }`}
                        title="Edit sets/reps"
                      >
                        <List className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setShowManualSwap(index)}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        title="Manually swap"
                      >
                        <RefreshCw className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      </button>
                      <button
                        onClick={() => removeExercise(index)}
                        className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                        title="Remove exercise"
                      >
                        <Trash2 className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  </div>
                  {editingExercise === index && renderExerciseEditor(exercise, index)}
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 space-y-3">
        {selectedForRegenerate.size > 0 && (
          <button
            onClick={() => generateAIWorkout(selectedForRegenerate)}
            className="w-full py-3 bg-violet-100 dark:bg-violet-900/30 hover:bg-violet-200 dark:hover:bg-violet-900/50 text-violet-700 dark:text-violet-300 font-semibold rounded-xl transition-all flex items-center justify-center gap-2"
          >
            <Wand2 className="w-5 h-5" />
            Regenerate {selectedForRegenerate.size} Exercise{selectedForRegenerate.size > 1 ? 's' : ''}
          </button>
        )}
        <button
          onClick={handleStartWorkout}
          disabled={draftExercises.length === 0}
          className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/30 disabled:shadow-none transition-all flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          Start Workout ({draftExercises.length} exercises)
        </button>
      </div>
    </div>
  );

  const renderManual = () => (
    <div className="flex-1 flex flex-col">
      {/* Search & Filter */}
      <div className="p-4 space-y-3 border-b border-gray-200 dark:border-gray-700">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search exercises..."
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          <button
            onClick={() => setSelectedMuscleGroup(null)}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
              !selectedMuscleGroup
                ? 'bg-violet-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
            }`}
          >
            All
          </button>
          {muscleGroups.map((muscle) => (
            <button
              key={muscle}
              onClick={() => setSelectedMuscleGroup(muscle)}
              className={`px-3 py-1.5 rounded-full text-sm capitalize whitespace-nowrap transition-colors ${
                selectedMuscleGroup === muscle
                  ? 'bg-violet-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              {muscle}
            </button>
          ))}
        </div>
      </div>

      {/* Selected Exercises */}
      {draftExercises.length > 0 && (
        <div className="p-4 bg-violet-50 dark:bg-violet-900/20 border-b border-violet-200 dark:border-violet-800">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-violet-700 dark:text-violet-300">
              Selected ({draftExercises.length})
            </span>
            <button
              onClick={() => setDraftExercises([])}
              className="text-sm text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300"
            >
              Clear all
            </button>
          </div>
          <div className="space-y-2">
            {draftExercises.map((ex, i) => (
              <div
                key={`selected-${ex.exerciseId}-${i}`}
                className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-violet-200 dark:border-violet-700"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 dark:text-white text-sm truncate">{ex.exerciseName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {ex.modality === ExerciseModality.DURATION
                        ? `${ex.durationSeconds}s`
                        : `${ex.sets} × ${ex.reps}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEditingExercise(editingExercise === i ? null : i)}
                      className={`p-1.5 rounded transition-colors ${
                        editingExercise === i
                          ? 'bg-violet-100 dark:bg-violet-900/30 text-violet-600'
                          : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500'
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => removeExercise(i)}
                      className="p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                    >
                      <X className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>
                {editingExercise === i && renderExerciseEditor(ex, i)}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Exercise List */}
      <div className="flex-1 overflow-auto p-4">
        <div className="space-y-2">
          {filteredExercises.map((exercise) => {
            const isSelected = draftExercises.some((e) => e.exerciseId === exercise.exerciseId);
            return (
              <button
                key={exercise.exerciseId}
                onClick={() => !isSelected && addExercise(exercise)}
                disabled={isSelected}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  isSelected
                    ? 'bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-700'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white">{exercise.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {exercise.muscleGroups.join(', ')} ·{' '}
                      {exercise.modality === ExerciseModality.DURATION
                        ? `${exercise.defaultDurationSeconds || DEFAULT_DURATION}s`
                        : `${exercise.defaultSets || DEFAULT_SETS} × ${exercise.defaultReps || DEFAULT_REPS}`}
                    </p>
                  </div>
                  {isSelected ? (
                    <Check className="w-5 h-5 text-violet-600" />
                  ) : (
                    <Plus className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Start Button */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          onClick={handleStartWorkout}
          disabled={draftExercises.length === 0}
          className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-semibold rounded-xl shadow-lg shadow-violet-500/30 disabled:shadow-none transition-all flex items-center justify-center gap-2"
        >
          <Play className="w-5 h-5" />
          Start Workout ({draftExercises.length} exercises)
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          onClick={() => {
            if (mode === 'select') {
              navigate('/');
            } else if (mode === 'ai-review') {
              setMode('ai-prompt');
            } else {
              setMode('select');
            }
          }}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          {mode === 'select' && 'New Workout'}
          {mode === 'manual' && 'Select Exercises'}
          {mode === 'ai-prompt' && 'AI Workout'}
          {mode === 'ai-generating' && 'Generating...'}
          {mode === 'ai-review' && 'Review Workout'}
        </h1>
      </div>

      {mode === 'select' && renderModeSelect()}
      {mode === 'ai-prompt' && renderAIPrompt()}
      {mode === 'ai-generating' && renderAIGenerating()}
      {mode === 'ai-review' && renderAIReview()}
      {mode === 'manual' && renderManual()}
    </div>
  );
}
