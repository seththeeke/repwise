import { GoalTimeframe } from '../../../lambdas/shared/src/enums.ts';
import type { Goal } from '../../../lambdas/shared/src/models.ts';

export function deriveEndDate(
  startDate: string,
  timeframe: GoalTimeframe
): string | undefined {
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
}

export function isGoalWindowActive(
  goal: Pick<Goal, 'endDate'>
): boolean {
  if (!goal.endDate) return true;
  return new Date(goal.endDate) > new Date();
}
