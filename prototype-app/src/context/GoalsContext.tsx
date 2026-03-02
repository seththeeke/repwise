import { createContext, useContext, useState, ReactNode } from 'react';
import { type Goal, GoalStatus, GoalType, GoalTimeframe } from '../types/index';
import { mockGoals } from '../data/mockData';
import { v4 as uuidv4 } from '../utils/uuid';

interface CreateGoalInput {
  type: GoalType;
  title: string;
  description?: string;
  targetValue: number;
  timeframe: GoalTimeframe;
  exerciseId?: string;
  exerciseName?: string;
  unit: string;
}

interface GoalsContextType {
  goals: Goal[];
  activeGoals: Goal[];
  completedGoals: Goal[];
  createGoal: (input: CreateGoalInput) => void;
  updateGoalProgress: (goalId: string, currentValue: number) => void;
  completeGoal: (goalId: string) => void;
  deleteGoal: (goalId: string) => void;
}

const GoalsContext = createContext<GoalsContextType | undefined>(undefined);

function getEndDateForTimeframe(timeframe: GoalTimeframe, startDate: Date): string | undefined {
  switch (timeframe) {
    case GoalTimeframe.WEEKLY:
      return new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
    case GoalTimeframe.MONTHLY:
      return new Date(startDate.getFullYear(), startDate.getMonth() + 1, startDate.getDate()).toISOString();
    case GoalTimeframe.QUARTERLY:
      return new Date(startDate.getFullYear(), startDate.getMonth() + 3, startDate.getDate()).toISOString();
    case GoalTimeframe.YEARLY:
      return new Date(startDate.getFullYear() + 1, startDate.getMonth(), startDate.getDate()).toISOString();
    case GoalTimeframe.ALL_TIME:
    default:
      return undefined;
  }
}

export function GoalsProvider({ children }: { children: ReactNode }) {
  const [goals, setGoals] = useState<Goal[]>(mockGoals);

  const activeGoals = goals.filter((g) => g.status === GoalStatus.ACTIVE);
  const completedGoals = goals.filter((g) => g.status === GoalStatus.COMPLETED);

  const createGoal = (input: CreateGoalInput) => {
    const now = new Date();
    const newGoal: Goal = {
      goalId: uuidv4(),
      userId: 'user1',
      type: input.type,
      status: GoalStatus.ACTIVE,
      title: input.title,
      description: input.description,
      targetValue: input.targetValue,
      currentValue: 0,
      unit: input.unit,
      timeframe: input.timeframe,
      exerciseId: input.exerciseId,
      exerciseName: input.exerciseName,
      startDate: now.toISOString(),
      endDate: getEndDateForTimeframe(input.timeframe, now),
      createdAt: now.toISOString(),
    };
    setGoals([newGoal, ...goals]);
  };

  const updateGoalProgress = (goalId: string, currentValue: number) => {
    setGoals((prev) =>
      prev.map((g) => {
        if (g.goalId !== goalId) return g;
        const updated = { ...g, currentValue };
        if (currentValue >= g.targetValue && g.status === GoalStatus.ACTIVE) {
          updated.status = GoalStatus.COMPLETED;
          updated.completedAt = new Date().toISOString();
        }
        return updated;
      })
    );
  };

  const completeGoal = (goalId: string) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.goalId === goalId
          ? { ...g, status: GoalStatus.COMPLETED, completedAt: new Date().toISOString() }
          : g
      )
    );
  };

  const deleteGoal = (goalId: string) => {
    setGoals((prev) => prev.filter((g) => g.goalId !== goalId));
  };

  return (
    <GoalsContext.Provider
      value={{
        goals,
        activeGoals,
        completedGoals,
        createGoal,
        updateGoalProgress,
        completeGoal,
        deleteGoal,
      }}
    >
      {children}
    </GoalsContext.Provider>
  );
}

export function useGoals() {
  const context = useContext(GoalsContext);
  if (context === undefined) {
    throw new Error('useGoals must be used within a GoalsProvider');
  }
  return context;
}
