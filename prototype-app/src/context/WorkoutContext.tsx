import { createContext, useContext, useState, ReactNode } from 'react';
import { type WorkoutExercise, type WorkoutInstance, WorkoutStatus, WorkoutSource, WeightUnit } from '../types/index';
import { mockRecentWorkouts } from '../data/mockData';
import { v4 as uuidv4 } from '../utils/uuid';

interface WorkoutContextType {
  recentWorkouts: WorkoutInstance[];
  currentWorkout: WorkoutInstance | null;
  draftExercises: WorkoutExercise[];
  setDraftExercises: (exercises: WorkoutExercise[]) => void;
  startWorkout: (exercises: WorkoutExercise[], source: WorkoutSource) => void;
  updateExercise: (index: number, updates: Partial<WorkoutExercise>) => void;
  completeWorkout: () => void;
  cancelWorkout: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const [recentWorkouts, setRecentWorkouts] = useState<WorkoutInstance[]>(mockRecentWorkouts);
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutInstance | null>(null);
  const [draftExercises, setDraftExercises] = useState<WorkoutExercise[]>([]);

  const startWorkout = (exercises: WorkoutExercise[], source: WorkoutSource) => {
    const workout: WorkoutInstance = {
      workoutInstanceId: uuidv4(),
      userId: 'user1',
      status: WorkoutStatus.IN_PROGRESS,
      source,
      startedAt: new Date().toISOString(),
      exercises: exercises.map((e, i) => ({
        ...e,
        orderIndex: i,
        skipped: false,
        weight: undefined,
        completedAt: undefined,
      })),
    };
    setCurrentWorkout(workout);
  };

  const updateExercise = (index: number, updates: Partial<WorkoutExercise>) => {
    if (!currentWorkout) return;

    const updatedExercises = [...currentWorkout.exercises];
    updatedExercises[index] = { ...updatedExercises[index], ...updates };

    setCurrentWorkout({
      ...currentWorkout,
      exercises: updatedExercises,
    });
  };

  const completeWorkout = () => {
    if (!currentWorkout) return;

    const completedAt = new Date().toISOString();
    const startedAt = new Date(currentWorkout.startedAt);
    const durationMinutes = Math.round((new Date(completedAt).getTime() - startedAt.getTime()) / 60000);

    const totalVolume = currentWorkout.exercises.reduce((sum, ex) => {
      if (ex.skipped || !ex.weight || !ex.sets || !ex.reps) return sum;
      return sum + (ex.weight * ex.sets * ex.reps);
    }, 0);

    const completedWorkout: WorkoutInstance = {
      ...currentWorkout,
      status: WorkoutStatus.COMPLETED,
      completedAt,
      durationMinutes,
      totalVolume,
      exercises: currentWorkout.exercises.map((ex) => ({
        ...ex,
        completedAt: ex.skipped ? undefined : completedAt,
      })),
    };

    setRecentWorkouts([completedWorkout, ...recentWorkouts]);
    setCurrentWorkout(null);
    setDraftExercises([]);
  };

  const cancelWorkout = () => {
    setCurrentWorkout(null);
    setDraftExercises([]);
  };

  return (
    <WorkoutContext.Provider
      value={{
        recentWorkouts,
        currentWorkout,
        draftExercises,
        setDraftExercises,
        startWorkout,
        updateExercise,
        completeWorkout,
        cancelWorkout,
      }}
    >
      {children}
    </WorkoutContext.Provider>
  );
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  if (context === undefined) {
    throw new Error('useWorkout must be used within a WorkoutProvider');
  }
  return context;
}
