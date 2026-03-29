import { registerPlugin } from '@capacitor/core';
import type { WorkoutLiveActivityPlugin } from './definitions';

const WorkoutLiveActivity = registerPlugin<WorkoutLiveActivityPlugin>('WorkoutLiveActivity', {
  web: () => import('./web').then((m) => new m.WorkoutLiveActivityWeb()),
});

export { WorkoutLiveActivity };
export type { WorkoutLiveActivityPayload, WorkoutModality } from './definitions';
