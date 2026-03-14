import type { Handler } from 'aws-lambda';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';
import {
  ddb,
  WORKOUTS_TABLE,
  METRICS_TABLE,
  queryGoalsByStatus,
  type ExerciseCatalogItem,
  type WorkoutInstance,
  type WorkoutExercise,
  type Goal,
  GoalStatus,
  WeightUnit,
} from '@repwise/shared';

const EXERCISE_PK_PREFIX = 'EXERCISE#';
const METADATA_SK = 'METADATA';
const WORKOUT_SK_PREFIX = 'WORKOUT#';

/** Amazon Titan Text Express — no API key; uses IAM. Enable in Bedrock console (Model access) if needed. */
const TITAN_MODEL_ID = 'amazon.titan-text-express-v1';

export interface AiGenerateEvent {
  userId: string;
  userPrompt: string;
  weightUnit?: string;
}

export interface AiGenerateResult {
  exercises: WorkoutExercise[];
}

async function getCatalog(): Promise<ExerciseCatalogItem[]> {
  const out = await ddb.send(
    new ScanCommand({
      TableName: WORKOUTS_TABLE,
      FilterExpression: 'begins_with(PK, :prefix) AND SK = :sk',
      ExpressionAttributeValues: {
        ':prefix': EXERCISE_PK_PREFIX,
        ':sk': METADATA_SK,
      },
    })
  );
  return (out.Items ?? []) as ExerciseCatalogItem[];
}

async function getRecentWorkouts(userId: string, limit: number): Promise<WorkoutInstance[]> {
  const out = await ddb.send(
    new QueryCommand({
      TableName: WORKOUTS_TABLE,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': WORKOUT_SK_PREFIX,
      },
      Limit: limit,
      ScanIndexForward: false,
    })
  );
  const items = (out.Items ?? []) as WorkoutInstance[];
  return items.filter((w) => w.status === 'completed');
}

async function getActiveGoals(userId: string): Promise<Goal[]> {
  return queryGoalsByStatus(userId, GoalStatus.ACTIVE);
}

function buildPrompt(
  userPrompt: string,
  catalog: ExerciseCatalogItem[],
  recentWorkouts: WorkoutInstance[],
  activeGoals: Goal[],
  weightUnit: WeightUnit
): string {
  return `You are a professional fitness coach building a personalized workout.

User request: "${userPrompt}"

User's active goals — use these to inform exercise selection and priorities:
${JSON.stringify(activeGoals, null, 2)}

Available exercises:
${JSON.stringify(catalog, null, 2)}

Recent workouts — avoid repeating the same primary muscle groups from the last 1-2 sessions:
${JSON.stringify(recentWorkouts.slice(0, 5), null, 2)}

Return ONLY a valid JSON array of WorkoutExercise objects. No explanation. No markdown. No code fences.
Each object must include: exerciseId, exerciseName, modality, sets, reps or durationSeconds, orderIndex, skipped (false).
Do not include weight — the user will enter that during execution.`;
}

function parseExercisesFromResponse(text: string): WorkoutExercise[] {
  let json = text.trim();
  const codeBlock = /```(?:json)?\s*([\s\S]*?)```/.exec(json);
  if (codeBlock) json = codeBlock[1].trim();
  const parsed = JSON.parse(json) as unknown;
  const arr = Array.isArray(parsed) ? parsed : [];
  return arr.map((item: Record<string, unknown>, i: number) => ({
    exerciseId: String(item.exerciseId ?? ''),
    exerciseName: String(item.exerciseName ?? item.name ?? ''),
    modality: (item.modality as WorkoutExercise['modality']) ?? 'sets_reps',
    sets: item.sets != null ? Number(item.sets) : undefined,
    reps: item.reps != null ? Number(item.reps) : undefined,
    durationSeconds: item.durationSeconds != null ? Number(item.durationSeconds) : undefined,
    skipped: false,
    orderIndex: item.orderIndex != null ? Number(item.orderIndex) : i,
  }));
}

export const handler: Handler<AiGenerateEvent, AiGenerateResult> = async (event) => {
  console.log('[AI] handler invoked', {
    userId: event.userId,
    userPromptLength: event.userPrompt?.length ?? 0,
    weightUnit: event.weightUnit,
  });
  const { userId, userPrompt, weightUnit: weightUnitStr } = event;
  if (!userId || !userPrompt) {
    console.error('[AI] validation failed: userId or userPrompt missing', { userId: !!userId, userPrompt: !!userPrompt });
    throw new Error('userId and userPrompt required');
  }

  console.log('[AI] fetching catalog, recent workouts, active goals');
  const [catalog, recentWorkouts, activeGoals] = await Promise.all([
    getCatalog(),
    getRecentWorkouts(userId, 10),
    getActiveGoals(userId),
  ]);
  console.log('[AI] data loaded', {
    catalogCount: catalog.length,
    recentWorkoutsCount: recentWorkouts.length,
    activeGoalsCount: activeGoals.length,
  });

  const weightUnit =
    weightUnitStr === 'KG' ? WeightUnit.KG : WeightUnit.LBS;

  const prompt = buildPrompt(
    userPrompt,
    catalog,
    recentWorkouts,
    activeGoals,
    weightUnit
  );
  console.log('[AI] prompt built', { promptLength: prompt.length });

  const bedrock = new BedrockRuntimeClient({});
  console.log('[AI] invoking Bedrock', { modelId: TITAN_MODEL_ID });
  const response = await bedrock.send(
    new InvokeModelCommand({
      modelId: TITAN_MODEL_ID,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        inputText: prompt,
        textGenerationConfig: {
          maxTokenCount: 4096,
          temperature: 0.3,
          topP: 0.9,
        },
      }),
    })
  );

  const decoded = new TextDecoder().decode(response.body);
  const parsed = JSON.parse(decoded) as {
    results?: Array<{ outputText?: string }>;
  };
  const text = parsed.results?.[0]?.outputText ?? '';
  console.log('[AI] Bedrock response', { outputLength: text.length, outputPreview: text.slice(0, 200) });
  let exercises: WorkoutExercise[];
  try {
    exercises = parseExercisesFromResponse(text);
  } catch (parseErr) {
    console.error('[AI] parseExercisesFromResponse failed', { error: parseErr, rawOutput: text.slice(0, 500) });
    throw parseErr;
  }
  console.log('[AI] success', { exercisesCount: exercises.length });
  return { exercises };
};
