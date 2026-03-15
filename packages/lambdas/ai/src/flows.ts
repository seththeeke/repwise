import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  ddb,
  WORKOUTS_TABLE,
  queryCatalog,
  queryGoalsByStatus,
  type ExerciseCatalogItem,
  type WorkoutExercise,
  type WorkoutInstance,
  type Goal,
  GoalStatus,
  WeightUnit,
} from '@repwise/shared';

const BEDROCK_MODEL = 'amazon.nova-micro-v1:0';
const WORKOUT_SK_PREFIX = 'WORKOUT#';

export interface IntentResult {
  muscleGroups?: string[];
  durationHint?: string;
  focus?: 'push' | 'pull' | 'legs' | 'full';
}

export interface RegenerateContext {
  exerciseIndices: number[];
  currentExerciseIds: string[];
  muscleGroup: string;
}

async function getRecentWorkouts(
  userId: string,
  limit: number
): Promise<WorkoutInstance[]> {
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
  return (out.Items ?? []).filter(
    (w) => (w as WorkoutInstance).status === 'completed'
  ) as WorkoutInstance[];
}

async function getActiveGoals(userId: string): Promise<Goal[]> {
  return queryGoalsByStatus(userId, GoalStatus.ACTIVE);
}

/** Small LLM: user prompt -> intent (muscle groups, focus, duration hint). */
export async function getIntentFromPrompt(
  userPrompt: string,
  bedrock: BedrockRuntimeClient
): Promise<IntentResult> {
  const prompt = `Given this fitness request, return ONLY a JSON object (no markdown, no explanation) with optional keys: muscleGroups (array of strings, e.g. ["chest","back"]), durationHint (string, e.g. "45 min"), focus ("push"|"pull"|"legs"|"full"). Use common muscle group names: chest, back, shoulders, biceps, triceps, legs, core, glutes.
Request: "${userPrompt}"`;
  const response = await bedrock.send(
    new ConverseCommand({
      modelId: BEDROCK_MODEL,
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 512, temperature: 0.2 },
    })
  );
  const text = (response.output?.message?.content ?? [])
    .map((b: { text?: string }) => b.text ?? '')
    .filter(Boolean)
    .join('');
  let parsed: IntentResult = {};
  try {
    const cleaned = text.replace(/```\w*\n?/g, '').trim();
    parsed = JSON.parse(cleaned) as IntentResult;
  } catch {
    // fallback: no intent
  }
  if (!Array.isArray(parsed.muscleGroups)) parsed.muscleGroups = [];
  return parsed;
}

function toCatalogSummary(ex: ExerciseCatalogItem): Record<string, unknown> {
  return {
    exerciseId: ex.exerciseId,
    name: ex.name,
    muscleGroups: ex.muscleGroups,
    muscleGroup: ex.muscleGroup,
    modality: ex.modality,
    defaultSets: ex.defaultSets,
    defaultReps: ex.defaultReps,
    defaultDurationSeconds: ex.defaultDurationSeconds,
  };
}

function toWorkoutSummary(w: WorkoutInstance): Record<string, unknown> {
  return {
    date: w.startedAt,
    exerciseNames: (w.exercises ?? []).map((e) => e.exerciseName),
  };
}

function toGoalSummary(g: Goal): Record<string, unknown> {
  return {
    type: g.type,
    title: g.title,
    targetValue: g.targetValue,
    unit: g.unit,
    exerciseName: g.exerciseName,
  };
}

/** Single Bedrock call: pick 5–8 exercises from candidates for user prompt; return JSON array. */
export async function selectExercises(
  userPrompt: string,
  candidates: ExerciseCatalogItem[],
  recentWorkouts: WorkoutInstance[],
  activeGoals: Goal[],
  bedrock: BedrockRuntimeClient
): Promise<WorkoutExercise[]> {
  const catalogJson = JSON.stringify(candidates.map(toCatalogSummary));
  const goalsJson = JSON.stringify(activeGoals.slice(0, 10).map(toGoalSummary));
  const recentJson = JSON.stringify(
    recentWorkouts.slice(0, 5).map(toWorkoutSummary)
  );
  const prompt = `You are a fitness coach. From the following exercises ONLY, pick 5–8 for this request. Return ONLY a JSON array of objects; each must have: exerciseId, exerciseName, modality, sets (or durationSeconds for time-based), reps if sets_reps, orderIndex (0-based), skipped: false. Do not add weight.
User request: "${userPrompt}"
Exercises (use only these exerciseIds): ${catalogJson}
User goals (optional context): ${goalsJson}
Recent workouts (vary focus): ${recentJson}`;
  const response = await bedrock.send(
    new ConverseCommand({
      modelId: BEDROCK_MODEL,
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 2048, temperature: 0.3 },
    })
  );
  const text = (response.output?.message?.content ?? [])
    .map((b: { text?: string }) => b.text ?? '')
    .filter(Boolean)
    .join('');
  return parseExercisesFromResponse(text);
}

/** Regenerate: pick one (or more) replacement exercises from candidates, same muscle group, excluding current. */
export async function pickReplacementExercises(
  candidates: ExerciseCatalogItem[],
  count: number,
  bedrock: BedrockRuntimeClient
): Promise<WorkoutExercise[]> {
  if (candidates.length === 0) return [];
  const catalogJson = JSON.stringify(candidates.map(toCatalogSummary));
  const prompt = `From these exercises, pick exactly ${count} different one(s). Return ONLY a JSON array of objects; each: exerciseId, exerciseName, modality, sets (or durationSeconds), reps if applicable, orderIndex 0-based, skipped: false. No weight.`;
  const fullPrompt = `Exercises to choose from: ${catalogJson}\n\n${prompt}`;
  const response = await bedrock.send(
    new ConverseCommand({
      modelId: BEDROCK_MODEL,
      messages: [{ role: 'user', content: [{ text: fullPrompt }] }],
      inferenceConfig: { maxTokens: 1024, temperature: 0.4 },
    })
  );
  const text = (response.output?.message?.content ?? [])
    .map((b: { text?: string }) => b.text ?? '')
    .filter(Boolean)
    .join('');
  return parseExercisesFromResponse(text);
}

function parseExercisesFromResponse(text: string): WorkoutExercise[] {
  let json = text.trim();
  const codeBlock = /```(?:json)?\s*([\s\S]*?)```/.exec(json);
  if (codeBlock) json = codeBlock[1].trim();
  const parsed = JSON.parse(json) as unknown;
  const arr = Array.isArray(parsed) ? parsed : [parsed].filter(Boolean);
  return arr.map((item: Record<string, unknown>, i: number) => ({
    exerciseId: String(item.exerciseId ?? ''),
    exerciseName: String(item.exerciseName ?? item.name ?? ''),
    modality: (item.modality as WorkoutExercise['modality']) ?? 'sets_reps',
    sets: item.sets != null ? Number(item.sets) : undefined,
    reps: item.reps != null ? Number(item.reps) : undefined,
    durationSeconds:
      item.durationSeconds != null ? Number(item.durationSeconds) : undefined,
    skipped: false,
    orderIndex: item.orderIndex != null ? Number(item.orderIndex) : i,
  }));
}

/** Full flow: intent -> goals/recent -> catalog by intent -> selection LLM. */
export async function runFullFlow(
  userId: string,
  userPrompt: string,
  weightUnit: WeightUnit,
  bedrock: BedrockRuntimeClient,
  onProgress: (step: string, message: string) => void,
  equipmentTypes?: string[]
): Promise<WorkoutExercise[]> {
  onProgress('analyzing_goals', 'Analyzing your fitness goals...');
  const intent = await getIntentFromPrompt(userPrompt, bedrock);
  console.log('[AI flow] intent', { muscleGroups: intent.muscleGroups, focus: intent.focus });
  onProgress('reviewing_history', 'Reviewing your recent workouts...');
  const [activeGoals, recentWorkouts] = await Promise.all([
    getActiveGoals(userId),
    getRecentWorkouts(userId, 10),
  ]);
  console.log('[AI flow] data loaded', { goals: activeGoals.length, recent: recentWorkouts.length });
  onProgress('scanning_catalog', 'Scanning exercise catalog...');
  const muscleGroups =
    intent.muscleGroups?.length ? intent.muscleGroups : undefined;
  const candidates = await queryCatalog({
    muscleGroups,
    equipmentTypes,
    limit: 50,
  });
  console.log('[AI flow] catalog', { candidatesCount: candidates.length, muscleGroups, equipmentTypes: equipmentTypes?.length });
  if (candidates.length === 0) {
    const fallback = await queryCatalog({ limit: 50, equipmentTypes });
    if (fallback.length === 0) throw new Error('No exercises in catalog');
    console.log('[AI flow] using fallback catalog', { count: fallback.length });
    return selectExercises(
      userPrompt,
      fallback,
      recentWorkouts,
      activeGoals,
      bedrock
    );
  }
  onProgress('balancing_muscles', 'Balancing muscle groups...');
  onProgress('optimizing_structure', 'Optimizing workout structure...');
  console.log('[AI flow] invoking Bedrock selectExercises');
  const selected = await selectExercises(
    userPrompt,
    candidates,
    recentWorkouts,
    activeGoals,
    bedrock
  );
  console.log('[AI flow] selectExercises returned', { count: selected.length });
  const validIds = new Set(candidates.map((c) => c.exerciseId));
  const validated = selected.filter((e) => validIds.has(e.exerciseId));
  if (validated.length === 0) throw new Error('No valid exercises selected');
  return validated.map((e, i) => ({ ...e, orderIndex: i }));
}

/** Regenerate flow: catalog by muscle group, exclude current, pick replacement(s), merge into list. */
export async function runRegenerateFlow(
  currentExercises: WorkoutExercise[],
  ctx: RegenerateContext,
  bedrock: BedrockRuntimeClient,
  onProgress: (step: string, message: string) => void
): Promise<WorkoutExercise[]> {
  onProgress('scanning_catalog', 'Scanning exercise catalog...');
  const all = await queryCatalog({
    muscleGroup: ctx.muscleGroup,
    limit: 50,
  });
  const exclude = new Set(ctx.currentExerciseIds);
  const candidates = all.filter((e) => !exclude.has(e.exerciseId));
  if (candidates.length === 0) {
    throw new Error(
      `No other exercises for muscle group "${ctx.muscleGroup}" to replace with.`
    );
  }
  onProgress('optimizing_structure', 'Picking replacements...');
  const count = Math.min(ctx.exerciseIndices.length, candidates.length);
  const replacements = await pickReplacementExercises(
    candidates,
    count,
    bedrock
  );
  const result = currentExercises.map((e) => ({ ...e }));
  const sortedIndices = [...ctx.exerciseIndices].sort((a, b) => a - b);
  for (let i = 0; i < sortedIndices.length && i < replacements.length; i++) {
    const idx = sortedIndices[i];
    const rep = { ...replacements[i], orderIndex: idx };
    if (idx >= 0 && idx < result.length) result[idx] = rep;
  }
  return result;
}
