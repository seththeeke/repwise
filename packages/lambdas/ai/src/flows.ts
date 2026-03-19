import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { GetCommand, PutCommand, QueryCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import {
  ddb,
  WORKOUTS_TABLE,
  BUILDER_SESSIONS_TABLE,
  BUILDER_AI_CONFIG_TABLE,
  queryCatalog,
  queryGoalsByStatus,
  type ExerciseCatalogItem,
  type WorkoutExercise,
  type WorkoutInstance,
  type Goal,
  GoalStatus,
  type ExerciseModality,
  WeightUnit,
} from '@repwise/shared';

const DEFAULT_BEDROCK_MODEL = 'amazon.nova-micro-v1:0';
const WORKOUT_SK_PREFIX = 'WORKOUT#';

export interface BuilderAiConfig {
  bedrockModelId: string;
  estimatedPricePerRequest?: string;
  intentPromptTemplate: string; // includes {{USER_PROMPT}}
  selectExercisesPromptTemplate: string; // includes {{USER_PROMPT}}, {{CONSTRAINTS_TEXT}}, {{CATALOG_JSON}}, {{GOALS_JSON}}, {{RECENT_JSON}}
  regeneratePromptTemplate: string; // includes {{COUNT}}, {{USER_PROMPT}}, {{MUSCLE_GROUP}}, {{EQUIPMENT_TYPES}}, {{CATALOG_JSON}}
}

const BUILDER_AI_CONFIG_PK = 'BUILDER_AI_CONFIG';
const BUILDER_AI_CONFIG_SK = 'GLOBAL';

export const DEFAULT_BUILDER_AI_CONFIG: BuilderAiConfig = {
  bedrockModelId: DEFAULT_BEDROCK_MODEL,
  estimatedPricePerRequest: '0.00',
  intentPromptTemplate: `Given this fitness request, return ONLY a JSON object (no markdown, no explanation) with optional keys:
muscleGroups (array of strings, e.g. ["chest","back"])
durationHint (string, e.g. "45 min")
focus ("push"|"pull"|"legs"|"full")
equipmentTokens (array of strings in the exercise catalog vocabulary ONLY, e.g. ["barbell","dumbbell","cable","machine","cardio"]).

Rules for equipmentTokens:
- If the user says "barbell", "barbells", or "barbell only", set equipmentTokens to ["barbell"].
- If the user says "dumbbell", "dumbbells", or "dumbbell only", set equipmentTokens to ["dumbbell"].
- If the user says "cables" or "cable only", set equipmentTokens to ["cable"].
- If the user says "machines" or "machine only", set equipmentTokens to ["machine"].
- If the user doesn't specify equipment constraints, return equipmentTokens as [] (or omit it).

Use common muscle group names: chest, back, shoulders, biceps, triceps, legs, core, glutes.
Request: "{{USER_PROMPT}}"`,
  selectExercisesPromptTemplate: `You are a fitness coach. From the following exercises ONLY, pick 5–8 for this request.

Hard constraints:
{{CONSTRAINTS_TEXT}}

Return ONLY a JSON array of objects; each must have: exerciseId, exerciseName, modality, sets (or durationSeconds for time-based), reps if sets_reps, orderIndex (0-based), skipped: false. Do not add weight.
User request: "{{USER_PROMPT}}"
Exercises (use only these exerciseIds): {{CATALOG_JSON}}
User goals (optional context): {{GOALS_JSON}}
Recent workouts (vary focus): {{RECENT_JSON}}`,
  regeneratePromptTemplate: `From these exercises, pick exactly {{COUNT}} different one(s).

Original user request (keep intent consistent): "{{USER_PROMPT}}"
Muscle group: {{MUSCLE_GROUP}}
Equipment constraints: {{EQUIPMENT_TYPES}}

Return ONLY a JSON array of objects; each: exerciseId, exerciseName, modality, sets (or durationSeconds), reps if applicable, orderIndex 0-based, skipped: false. No weight.`,
};

let cachedBuilderAiConfig: { value: BuilderAiConfig; expiresAtMs: number } | null = null;

function renderTemplate(
  template: string,
  vars: Record<string, string>
): string {
  let out = template;
  for (const [k, v] of Object.entries(vars)) {
    // Avoid String.prototype.replaceAll for older TS lib targets.
    out = out.split(`{{${k}}}`).join(v);
  }
  return out;
}

async function loadBuilderAiConfig(): Promise<BuilderAiConfig> {
  const now = Date.now();
  if (cachedBuilderAiConfig && cachedBuilderAiConfig.expiresAtMs > now) {
    return cachedBuilderAiConfig.value;
  }

  const out = await ddb.send(
    new GetCommand({
      TableName: BUILDER_AI_CONFIG_TABLE,
      Key: { PK: BUILDER_AI_CONFIG_PK, SK: BUILDER_AI_CONFIG_SK },
    })
  );
  const item = out.Item as Partial<BuilderAiConfig> | undefined;
  const merged: BuilderAiConfig = {
    bedrockModelId: item?.bedrockModelId ?? DEFAULT_BEDROCK_MODEL,
    estimatedPricePerRequest:
      typeof item?.estimatedPricePerRequest === 'string'
        ? item.estimatedPricePerRequest
        : DEFAULT_BUILDER_AI_CONFIG.estimatedPricePerRequest,
    intentPromptTemplate:
      item?.intentPromptTemplate?.trim() ? item.intentPromptTemplate : DEFAULT_BUILDER_AI_CONFIG.intentPromptTemplate,
    selectExercisesPromptTemplate:
      item?.selectExercisesPromptTemplate?.trim()
        ? item.selectExercisesPromptTemplate
        : DEFAULT_BUILDER_AI_CONFIG.selectExercisesPromptTemplate,
    regeneratePromptTemplate:
      item?.regeneratePromptTemplate?.trim()
        ? item.regeneratePromptTemplate
        : DEFAULT_BUILDER_AI_CONFIG.regeneratePromptTemplate,
  };

  cachedBuilderAiConfig = {
    value: merged,
    expiresAtMs: now + 60_000,
  };
  return merged;
}

export interface IntentResult {
  muscleGroups?: string[];
  durationHint?: string;
  focus?: 'push' | 'pull' | 'legs' | 'full';
  /**
   * Equipment tokens in the exercise catalog vocabulary (e.g. "barbell", "dumbbell", "cable", "machine", "cardio").
   * If the user doesn't specify equipment constraints, this should be an empty array or omitted.
   */
  equipmentTokens?: string[];
}

export interface RegenerateContext {
  exerciseIndices: number[];
  currentExerciseIds: string[];
  targetMuscleGroups?: string[];
  /**
   * Original user prompt used for regeneration (so replacements stay consistent).
   * Optional: older clients may not send it.
   */
  userPrompt?: string;
  /**
   * Equipment constraints to filter the candidate set before regenerating.
   * May be gym equipment categories (e.g. "free_weights") or catalog tokens (e.g. "barbell").
   */
  equipmentTypes?: string[];
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
  bedrock: BedrockRuntimeClient,
  builderAiConfig: BuilderAiConfig
): Promise<IntentResult> {
  const prompt = renderTemplate(builderAiConfig.intentPromptTemplate, {
    USER_PROMPT: userPrompt,
  });
  const response = await bedrock.send(
    new ConverseCommand({
      modelId: builderAiConfig.bedrockModelId,
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
  if (!Array.isArray(parsed.equipmentTokens)) parsed.equipmentTokens = undefined;
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
  bedrock: BedrockRuntimeClient,
  builderAiConfig: BuilderAiConfig,
  constraints?: {
    effectiveMuscleGroups?: string[];
    effectiveEquipmentTokens?: string[];
    focus?: 'push' | 'pull' | 'legs' | 'full';
  }
): Promise<WorkoutExercise[]> {
  const catalogJson = JSON.stringify(candidates.map(toCatalogSummary));
  const goalsJson = JSON.stringify(activeGoals.slice(0, 10).map(toGoalSummary));
  const recentJson = JSON.stringify(
    recentWorkouts.slice(0, 5).map(toWorkoutSummary)
  );
  const focusText = constraints?.focus ? `Focus: ${constraints.focus}\n` : '';
  const muscleText =
    constraints?.effectiveMuscleGroups?.length
      ? `Effective muscle groups: ${constraints.effectiveMuscleGroups.join(', ')}\n`
      : '';
  const equipmentText =
    constraints?.effectiveEquipmentTokens?.length
      ? `Equipment constraints (catalog tokens): ${constraints.effectiveEquipmentTokens.join(', ')}\n`
      : '';

  const constraintsText = [focusText, muscleText, equipmentText]
    .filter(Boolean)
    .join('');
  const prompt = renderTemplate(builderAiConfig.selectExercisesPromptTemplate, {
    USER_PROMPT: userPrompt,
    CONSTRAINTS_TEXT: constraintsText || 'None',
    CATALOG_JSON: catalogJson,
    GOALS_JSON: goalsJson,
    RECENT_JSON: recentJson,
  });
  const response = await bedrock.send(
    new ConverseCommand({
      modelId: builderAiConfig.bedrockModelId,
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
  bedrock: BedrockRuntimeClient,
  builderAiConfig: BuilderAiConfig,
  opts?: {
    userPrompt?: string;
    equipmentTypes?: string[];
    muscleGroup?: string;
  }
): Promise<WorkoutExercise[]> {
  if (candidates.length === 0) return [];
  const catalogJson = JSON.stringify(candidates.map(toCatalogSummary));
  const equipmentTypesStr = opts?.equipmentTypes?.join(', ') ?? '';
  const prompt = renderTemplate(builderAiConfig.regeneratePromptTemplate, {
    COUNT: String(count),
    USER_PROMPT: opts?.userPrompt ?? '',
    MUSCLE_GROUP: opts?.muscleGroup ?? '',
    EQUIPMENT_TYPES: equipmentTypesStr,
    CATALOG_JSON: catalogJson,
  });
  const response = await bedrock.send(
    new ConverseCommand({
      modelId: builderAiConfig.bedrockModelId,
      messages: [{ role: 'user', content: [{ text: prompt }] }],
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

function resolveFocusToMuscleGroups(
  focus?: 'push' | 'pull' | 'legs' | 'full'
): string[] | undefined {
  switch (focus) {
    case 'push':
      return ['chest', 'shoulders', 'triceps'];
    case 'pull':
      return ['back', 'biceps', 'triceps'];
    case 'legs':
      return ['quadriceps', 'hamstrings', 'glutes'];
    case 'full':
      return ['chest', 'back', 'shoulders', 'biceps', 'triceps', 'legs', 'core'];
    default:
      return undefined;
  }
}

function toWorkoutExerciseFromCatalog(
  ex: ExerciseCatalogItem,
  orderIndex: number
): WorkoutExercise {
  const modality = ex.modality as ExerciseModality;
  return {
    exerciseId: ex.exerciseId,
    exerciseName: ex.name,
    modality,
    sets: modality === 'duration' ? undefined : (ex.defaultSets ?? 3),
    reps: modality === 'duration' ? undefined : (ex.defaultReps ?? 8),
    durationSeconds:
      modality === 'duration' ? (ex.defaultDurationSeconds ?? 60) : undefined,
    skipped: false,
    orderIndex,
  };
}

/** Full flow: intent -> goals/recent -> catalog by intent -> selection LLM. */
export async function runFullFlow(
  userId: string,
  userPrompt: string,
  weightUnit: WeightUnit,
  bedrock: BedrockRuntimeClient,
  onProgress: (step: string, message: string) => void,
  equipmentTypes?: string[],
  builderSessionId?: string
): Promise<WorkoutExercise[]> {
  onProgress('analyzing_goals', 'Analyzing your fitness goals...');
  const builderAiConfig = await loadBuilderAiConfig();
  const intent = await getIntentFromPrompt(userPrompt, bedrock, builderAiConfig);
  const focusMuscleGroups = resolveFocusToMuscleGroups(intent.focus);
  const effectiveMuscleGroups =
    focusMuscleGroups?.length
      ? focusMuscleGroups
      : intent.muscleGroups?.length
        ? intent.muscleGroups
        : undefined;
  const effectiveEquipmentTokens =
    intent.equipmentTokens?.length ? intent.equipmentTokens : undefined;
  const effectiveEquipmentFilter = effectiveEquipmentTokens ?? equipmentTypes;

  console.log('[AI flow] intent', {
    muscleGroups: intent.muscleGroups,
    focus: intent.focus,
    effectiveMuscleGroups,
    effectiveEquipmentTokens,
  });
  onProgress('reviewing_history', 'Reviewing your recent workouts...');
  const [activeGoals, recentWorkouts] = await Promise.all([
    getActiveGoals(userId),
    getRecentWorkouts(userId, 10),
  ]);
  console.log('[AI flow] data loaded', { goals: activeGoals.length, recent: recentWorkouts.length });
  onProgress('scanning_catalog', 'Scanning exercise catalog...');
  const candidates = await queryCatalog({
    muscleGroups: effectiveMuscleGroups,
    equipmentTypes: effectiveEquipmentFilter,
    limit: 50,
  });
  console.log('[AI flow] catalog', {
    candidatesCount: candidates.length,
    muscleGroups: effectiveMuscleGroups,
    equipmentTypes: effectiveEquipmentFilter?.length,
  });
  const selectedBase: ExerciseCatalogItem[] =
    candidates.length === 0
      ? await queryCatalog({ limit: 50, equipmentTypes: effectiveEquipmentFilter })
      : candidates;

  if (selectedBase.length === 0) throw new Error('No exercises in catalog');

  if (candidates.length === 0) {
    console.log('[AI flow] using fallback catalog', { count: selectedBase.length });
  }

  onProgress('balancing_muscles', 'Balancing muscle groups...');
  onProgress('optimizing_structure', 'Optimizing workout structure...');
  console.log('[AI flow] invoking Bedrock selectExercises');
  const selected = await selectExercises(
    userPrompt,
    selectedBase,
    recentWorkouts,
    activeGoals,
    bedrock,
    builderAiConfig,
    {
      effectiveMuscleGroups,
      effectiveEquipmentTokens,
      focus: intent.focus,
    }
  );
  console.log('[AI flow] selectExercises returned', { count: selected.length });
  const validIds = new Set(selectedBase.map((c) => c.exerciseId));
  const validated = selected.filter((e) => validIds.has(e.exerciseId));
  if (validated.length === 0) throw new Error('No valid exercises selected');

  if (builderSessionId) {
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 5;
    await ddb.send(
      new PutCommand({
        TableName: BUILDER_SESSIONS_TABLE,
        Item: {
          PK: `USER#${userId}`,
          SK: `SESSION#${builderSessionId}`,
          originalPrompt: userPrompt,
          focus: intent.focus ?? null,
          effectiveMuscleGroups: effectiveMuscleGroups ?? [],
          effectiveEquipmentFilter: effectiveEquipmentFilter ?? [],
          effectiveEquipmentTokens: effectiveEquipmentTokens ?? [],
          createdAt: new Date().toISOString(),
          expiresAt,
          lastExerciseIds: validated.map((v) => v.exerciseId),
        } as Record<string, unknown>,
      })
    );
  }

  return validated.map((e, i) => ({ ...e, orderIndex: i }));
}

/** Regenerate flow: replace each selected index with a new exercise. */
export async function runRegenerateFlow(
  currentExercises: WorkoutExercise[],
  ctx: RegenerateContext,
  userId: string,
  builderSessionId: string | undefined,
  bedrock: BedrockRuntimeClient,
  onProgress: (step: string, message: string) => void
): Promise<WorkoutExercise[]> {
  let effectiveEquipmentTypes = ctx.equipmentTypes;
  let effectiveUserPrompt = ctx.userPrompt;
  let storedEffectiveMuscleGroups: string[] | undefined;
  const builderAiConfig = await loadBuilderAiConfig();

  if (builderSessionId) {
    const out = await ddb.send(
      new GetCommand({
        TableName: BUILDER_SESSIONS_TABLE,
        Key: { PK: `USER#${userId}`, SK: `SESSION#${builderSessionId}` },
      })
    );
    const session = out.Item as
      | {
          originalPrompt?: string;
          effectiveEquipmentFilter?: string[];
          effectiveMuscleGroups?: string[];
        }
      | undefined;

    if (session?.originalPrompt && !effectiveUserPrompt) {
      effectiveUserPrompt = session.originalPrompt;
    }
    if (session?.effectiveEquipmentFilter?.length) {
      effectiveEquipmentTypes = session.effectiveEquipmentFilter;
    }
    storedEffectiveMuscleGroups = session?.effectiveMuscleGroups;
  }

  const result = currentExercises.map((e) => ({ ...e }));
  const sortedIndices = [...ctx.exerciseIndices].sort((a, b) => a - b);

  // Map each index being regenerated to its target muscle group.
  const targetMuscleByIndex = new Map<number, string>();
  if (
    Array.isArray(ctx.targetMuscleGroups) &&
    ctx.targetMuscleGroups.length === ctx.exerciseIndices.length
  ) {
    ctx.exerciseIndices.forEach((idx, i) => {
      targetMuscleByIndex.set(idx, ctx.targetMuscleGroups?.[i] ?? 'full');
    });
  }

  // If we don't have per-index muscle groups (older clients), fall back to "full".
  for (const idx of sortedIndices) {
    if (!targetMuscleByIndex.has(idx)) targetMuscleByIndex.set(idx, 'full');
  }

  const exclude = new Set(ctx.currentExerciseIds); // exclude the whole active builder list
  const usedReplacementIds = new Set<string>();

  onProgress('scanning_catalog', 'Scanning exercise catalog...');

  for (const idx of sortedIndices) {
    const targetMuscleGroup = targetMuscleByIndex.get(idx) ?? 'full';

    // We query within the selected exercise's muscle group so regen works even when
    // multiple muscle groups are regenerated together.
    const queryByMuscle = targetMuscleGroup && targetMuscleGroup !== 'full';
    const candidatesAll = queryByMuscle
      ? await queryCatalog({
          muscleGroup: targetMuscleGroup,
          equipmentTypes: effectiveEquipmentTypes,
          limit: 50,
        })
      : await queryCatalog({
          limit: 50,
          equipmentTypes: effectiveEquipmentTypes,
        });

    const candidates = candidatesAll.filter(
      (e) => !exclude.has(e.exerciseId) && !usedReplacementIds.has(e.exerciseId)
    );

    if (candidates.length === 0) {
      throw new Error(
        `No other exercises for muscle group "${targetMuscleGroup}" to replace with.`
      );
    }

    onProgress('optimizing_structure', 'Picking replacements...');

    const replacements = await pickReplacementExercises(
      candidates,
      1,
      bedrock,
      builderAiConfig,
      {
        userPrompt: effectiveUserPrompt,
        equipmentTypes: effectiveEquipmentTypes,
        muscleGroup: targetMuscleGroup,
      }
    );

    const first = replacements[0];
    const valid = first && candidates.some((c) => c.exerciseId === first.exerciseId);
    const chosen = valid
      ? first
      : toWorkoutExerciseFromCatalog(candidates[0], 0);

    // Ensure regenerated exercise never duplicates another regenerated/active exercise.
    if (exclude.has(chosen.exerciseId) || usedReplacementIds.has(chosen.exerciseId)) {
      // Defensive: should never happen due to candidate filtering; fall back deterministically.
      const fallback = candidates.find((c) => !exclude.has(c.exerciseId)) ?? candidates[0];
      const fallbackChosen = toWorkoutExerciseFromCatalog(fallback, 0);
      usedReplacementIds.add(fallbackChosen.exerciseId);
      result[idx] = { ...fallbackChosen, orderIndex: idx };
    } else {
      usedReplacementIds.add(chosen.exerciseId);
      result[idx] = { ...chosen, orderIndex: idx };
    }

    // Optional: if the regen selection is outside the originally stored focus, we
    // don't hard-fail here since we already guarantee muscle-group correctness via
    // the catalog query.
    if (
      storedEffectiveMuscleGroups?.length &&
      targetMuscleGroup !== 'full' &&
      !storedEffectiveMuscleGroups.includes(targetMuscleGroup)
    ) {
      console.log('[AI regen] target muscle outside stored focus', {
        targetMuscleGroup,
        storedEffectiveMuscleGroups,
      });
    }
  }

  if (builderSessionId) {
    await ddb.send(
      new UpdateCommand({
        TableName: BUILDER_SESSIONS_TABLE,
        Key: { PK: `USER#${userId}`, SK: `SESSION#${builderSessionId}` },
        UpdateExpression: 'SET lastExerciseIds = :ids, updatedAt = :u',
        ExpressionAttributeValues: {
          ':ids': result.map((r) => r.exerciseId),
          ':u': new Date().toISOString(),
        },
      })
    );
  }

  return result;
}
