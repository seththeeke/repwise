import { WebPlugin } from '@capacitor/core';
import type { WorkoutLiveActivityPayload, WorkoutLiveActivityPlugin } from './definitions';

export class WorkoutLiveActivityWeb extends WebPlugin implements WorkoutLiveActivityPlugin {
  async startWorkoutActivity(_payload: WorkoutLiveActivityPayload): Promise<void> {
    // Live Activities are iOS-only.
  }

  async updateWorkoutActivity(_payload: WorkoutLiveActivityPayload): Promise<void> {
    // no-op
  }

  async endWorkoutActivity(): Promise<void> {
    // no-op
  }
}
