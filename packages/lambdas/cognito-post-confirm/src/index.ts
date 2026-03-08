import type { PostConfirmationTriggerEvent } from 'aws-lambda';

/**
 * Stub post-confirmation trigger. Returns the event so Cognito is satisfied.
 * Full implementation (UserProfile + GlobalMetrics in DynamoDB) will be added
 * when USERS_TABLE and METRICS_TABLE exist (Phase 4 per backend-spec).
 */
export const handler = async (
  event: PostConfirmationTriggerEvent
): Promise<PostConfirmationTriggerEvent> => {
  return event;
};
