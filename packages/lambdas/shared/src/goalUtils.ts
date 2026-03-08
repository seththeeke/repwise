import { GoalTimeframe } from './enums';
import type { Goal } from './models';

export const deriveEndDate = (startDate: string, timeframe: GoalTimeframe): string | undefined => {
  if (timeframe === GoalTimeframe.ALL_TIME) return undefined;
  const start = new Date(startDate);
  switch (timeframe) {
    case GoalTimeframe.WEEKLY:
      start.setDate(start.getDate() + 7);
      break;
    case GoalTimeframe.MONTHLY:
      start.setMonth(start.getMonth() + 1);
      break;
    case GoalTimeframe.QUARTERLY:
      start.setMonth(start.getMonth() + 3);
      break;
    case GoalTimeframe.YEARLY:
      start.setFullYear(start.getFullYear() + 1);
      break;
  }
  return start.toISOString();
};

export const isGoalWindowActive = (goal: Pick<Goal, 'endDate'>): boolean => {
  if (!goal.endDate) return true;
  return new Date(goal.endDate) > new Date();
};
