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
  /** Deprecated: no longer used; kept for admin config backwards compatibility. */
  intentPromptTemplate: string;
  /** Full generation: {{USER_PROMPT}}, {{CATALOG}}, {{EQUIPMENT_HINT}}, {{GOALS_JSON}}, {{RECENT_JSON}} */
  selectExercisesPromptTemplate: string;
  /** Regeneration: {{USER_PROMPT}}, {{CATALOG}}, {{EXCLUDE_IDS}}, {{COUNT}} */
  regeneratePromptTemplate: string;
}

const BUILDER_AI_CONFIG_PK = 'BUILDER_AI_CONFIG';
const BUILDER_AI_CONFIG_SK = 'GLOBAL';

/** Fire-and-forget: record token usage for cost tracking. Does not throw. */
function recordTokenUsage(
  modelId: string,
  userId: string,
  inputTokens: number,
  outputTokens: number,
  runType: 'full' | 'regenerate'
): void {
  const now = new Date().toISOString();
  const sk = `${userId}#${now}`;
  ddb
    .send(
      new PutCommand({
        TableName: BUILDER_AI_CONFIG_TABLE,
        Item: {
          PK: modelId,
          SK: sk,
          inputTokens,
          outputTokens,
          runType,
          createdAt: now,
        } as Record<string, unknown>,
      })
    )
    .catch((err) => console.error('[AI flow] recordTokenUsage failed', err));
}

/** Compact format: id|name|mg|eq|mod|s|r (one line per exercise for token efficiency). */
function compressCatalogForPrompt(items: ExerciseCatalogItem[]): string {
  return items
    .map((ex) => {
      const mod = ex.modality === 'duration' ? 'd' : 'r';
      const s = ex.modality === 'duration' ? (ex.defaultDurationSeconds ?? 60) : (ex.defaultSets ?? 3);
      const r = ex.modality === 'duration' ? '' : (ex.defaultReps ?? 8);
      const eq = ex.equipmentPrimary ?? (ex.equipment?.[0] ?? '');
      return `${ex.exerciseId}|${ex.name}|${ex.muscleGroup}|${eq}|${mod}|${s}|${r}`;
    })
    .join('\n');
}

export const DEFAULT_BUILDER_AI_CONFIG: BuilderAiConfig = {
  bedrockModelId: DEFAULT_BEDROCK_MODEL,
  estimatedPricePerRequest: '0.00',
  intentPromptTemplate: '',
  selectExercisesPromptTemplate: `You are a fitness coach. Below is the full exercise catalog (format: exerciseId|name|muscleGroup|equipment|modality|sets|reps). Pick 5–8 exercises for this request. Use ONLY exerciseIds from the catalog.

{{EQUIPMENT_HINT}}

Return ONLY a JSON array of objects; each must have: exerciseId, exerciseName, modality, sets (or durationSeconds for time-based), reps if sets_reps, orderIndex (0-based), skipped: false. Do not add weight.

User request: "{{USER_PROMPT}}"

Catalog (one per line, format id|name|mg|equip|mod|sets|reps):
{{CATALOG}}

User goals (optional context): {{GOALS_JSON}}
Recent workouts (vary focus): {{RECENT_JSON}}`,
  regeneratePromptTemplate: `You are a fitness coach. From the catalog below, pick exactly {{COUNT}} replacement exercise(s). Do NOT pick any exercise whose exerciseId is in this list: {{EXCLUDE_IDS}}. Match the original user request intent.

User request: "{{USER_PROMPT}}"

Catalog (format id|name|mg|equip|mod|sets|reps):
{{CATALOG}}

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
    intentPromptTemplate: item?.intentPromptTemplate?.trim() ?? '',
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

/** Single Bedrock call: pick 5–8 exercises from full catalog for user prompt; return JSON array. */
export async function selectExercises(
  userPrompt: string,
  catalog: ExerciseCatalogItem[],
  recentWorkouts: WorkoutInstance[],
  activeGoals: Goal[],
  bedrock: BedrockRuntimeClient,
  builderAiConfig: BuilderAiConfig,
  equipmentHint?: string,
  userId?: string
): Promise<WorkoutExercise[]> {
  console.log('[AI flow] catalog exercise names (before model)', {
    count: catalog.length,
    names: catalog.map((c) => c.name),
  });
  const compressed = compressCatalogForPrompt(catalog);
  const goalsJson = JSON.stringify(activeGoals.slice(0, 10).map(toGoalSummary));
  const recentJson = JSON.stringify(
    recentWorkouts.slice(0, 5).map(toWorkoutSummary)
  );
  const equipmentHintText =
    equipmentHint?.trim() || 'None (user did not specify equipment preferences).';
  const prompt = renderTemplate(builderAiConfig.selectExercisesPromptTemplate, {
    USER_PROMPT: userPrompt,
    CATALOG: compressed,
    EQUIPMENT_HINT: equipmentHintText,
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
  const usage = (response as { usage?: { inputTokens?: number; outputTokens?: number } }).usage;
  if (userId && usage?.inputTokens != null && usage?.outputTokens != null) {
    recordTokenUsage(
      builderAiConfig.bedrockModelId,
      userId,
      usage.inputTokens,
      usage.outputTokens,
      'full'
    );
  }
  const text = (response.output?.message?.content ?? [])
    .map((b: { text?: string }) => b.text ?? '')
    .filter(Boolean)
    .join('');
  console.log('[AI flow] selectExercises model raw', {
    rawLength: text.length,
    rawPreview: text.length > 800 ? `${text.slice(0, 400)}...[truncated]...${text.slice(-400)}` : text,
  });
  const parsed = parseExercisesFromResponse(text);
  console.log('[AI flow] selectExercises model parsed', {
    count: parsed.length,
    exercises: parsed.map((e) => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      modality: e.modality,
      sets: e.sets,
      reps: e.reps,
      durationSeconds: e.durationSeconds,
    })),
  });
  return parsed;
}

/** Regenerate: pick count replacement(s) from full catalog, excluding given ids. */
export async function pickReplacementExercises(
  catalog: ExerciseCatalogItem[],
  count: number,
  bedrock: BedrockRuntimeClient,
  builderAiConfig: BuilderAiConfig,
  opts: {
    userPrompt?: string;
    excludeIds: string[];
    userId?: string;
  }
): Promise<WorkoutExercise[]> {
  if (catalog.length === 0) return [];
  const compressed = compressCatalogForPrompt(catalog);
  const excludeIdsStr = opts.excludeIds.length
    ? opts.excludeIds.join(', ')
    : 'none';
  const prompt = renderTemplate(builderAiConfig.regeneratePromptTemplate, {
    COUNT: String(count),
    USER_PROMPT: opts.userPrompt ?? '',
    CATALOG: compressed,
    EXCLUDE_IDS: excludeIdsStr,
  });
  const response = await bedrock.send(
    new ConverseCommand({
      modelId: builderAiConfig.bedrockModelId,
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 1024, temperature: 0.4 },
    })
  );
  const usage = (response as { usage?: { inputTokens?: number; outputTokens?: number } }).usage;
  if (opts.userId && usage?.inputTokens != null && usage?.outputTokens != null) {
    recordTokenUsage(
      builderAiConfig.bedrockModelId,
      opts.userId,
      usage.inputTokens,
      usage.outputTokens,
      'regenerate'
    );
  }
  const text = (response.output?.message?.content ?? [])
    .map((b: { text?: string }) => b.text ?? '')
    .filter(Boolean)
    .join('');
  console.log('[AI regen] pickReplacement model raw', {
    rawLength: text.length,
    rawPreview: text.length > 800 ? `${text.slice(0, 400)}...[truncated]...${text.slice(-400)}` : text,
  });
  const parsed = parseExercisesFromResponse(text);
  console.log('[AI regen] pickReplacement model parsed', {
    count: parsed.length,
    exercises: parsed.map((e) => ({
      exerciseId: e.exerciseId,
      exerciseName: e.exerciseName,
      modality: e.modality,
    })),
  });
  return parsed;
}

/** Normalize for fuzzy matching: lowercase, strip spaces/hyphens so "Push-Up" and "Pushup" match. */
function normalizeForMatch(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s\-_']+/g, '')
    .trim();
}

/** Resolve model output to catalog items. Handles model returning names instead of ids, casing, hyphen/space variations. */
function resolveSelectedToCatalog(
  selected: WorkoutExercise[],
  catalog: ExerciseCatalogItem[]
): WorkoutExercise[] {
  const byId = new Map(catalog.map((c) => [c.exerciseId, c]));
  const byIdLower = new Map(
    catalog.map((c) => [c.exerciseId.toLowerCase(), c])
  );
  const byNameLower = new Map(
    catalog.map((c) => [c.name.toLowerCase().trim(), c])
  );
  const byNameNormalized = new Map(
    catalog.map((c) => [normalizeForMatch(c.name), c])
  );
  const resolved: WorkoutExercise[] = [];
  const catalogByNameNorm = [...catalog].map((c) => ({
    norm: normalizeForMatch(c.name),
    item: c,
  }));
  const seen = new Set<string>();
  const filtered: Array<{ exerciseId: string; exerciseName: string; reason: string }> = [];

  for (const s of selected) {
    const idRaw = String(s.exerciseId ?? '').trim();
    const nameRaw = String(s.exerciseName ?? '').trim();
    const nameNorm = nameRaw ? normalizeForMatch(nameRaw) : '';
    let c =
      (idRaw && byId.get(idRaw)) ??
      (idRaw && byIdLower.get(idRaw.toLowerCase())) ??
      (nameRaw && byNameLower.get(nameRaw.toLowerCase())) ??
      (nameNorm && byNameNormalized.get(nameNorm));
    if (!c && nameNorm) {
      let contained = catalogByNameNorm.filter(({ norm }) =>
        norm.includes(nameNorm)
      );
      if (contained.length === 0) {
        contained = catalogByNameNorm.filter(({ norm }) =>
          nameNorm.includes(norm)
        );
      }
      if (contained.length === 0) {
        const withoutShoulder = nameNorm.replace(/shoulder/g, '');
        if (withoutShoulder.length >= 4) {
          contained = catalogByNameNorm.filter(({ norm }) =>
            norm.includes(withoutShoulder)
          );
        }
      }
      if (contained.length === 0 && nameNorm === 'pushpress') {
        contained = catalogByNameNorm.filter(({ norm }) =>
          norm.includes('overheadpress')
        );
      }
      if (contained.length >= 1) {
        c = contained[0].item;
      }
    }
    if (!c) {
      filtered.push({
        exerciseId: idRaw,
        exerciseName: nameRaw,
        reason: 'no_match',
      });
      continue;
    }
    if (seen.has(c.exerciseId)) {
      filtered.push({
        exerciseId: idRaw,
        exerciseName: nameRaw,
        reason: 'duplicate',
      });
      continue;
    }
    seen.add(c.exerciseId);
    resolved.push({
      exerciseId: c.exerciseId,
      exerciseName: c.name,
      modality: s.modality ?? (c.modality as ExerciseModality),
      sets: s.sets ?? (c.modality === 'duration' ? undefined : (c.defaultSets ?? 3)),
      reps: s.reps ?? (c.modality === 'duration' ? undefined : (c.defaultReps ?? 8)),
      durationSeconds:
        s.durationSeconds ??
        (c.modality === 'duration' ? (c.defaultDurationSeconds ?? 60) : undefined),
      skipped: false,
      orderIndex: resolved.length,
    });
  }
  if (filtered.length > 0) {
    console.log('[AI flow] resolution filtered', {
      filteredCount: filtered.length,
      filtered,
    });
  }
  return resolved;
}

function parseExercisesFromResponse(text: string): WorkoutExercise[] {
  let json = text.trim();
  const codeBlock = /```(?:json)?\s*([\s\S]*?)```/.exec(json);
  if (codeBlock) json = codeBlock[1].trim();
  const parsed = JSON.parse(json) as unknown;
  const arr = Array.isArray(parsed) ? parsed : [parsed].filter(Boolean);
  return arr.map((item: Record<string, unknown>, i: number) => ({
    exerciseId: String(item.exerciseId ?? item.id ?? ''),
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

/** Full flow: load full catalog + goals/recent, single LLM call to pick 5–8 exercises. */
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
  console.log('[AI flow] model and prompt', {
    modelId: builderAiConfig.bedrockModelId,
    userPrompt,
  });
  onProgress('reviewing_history', 'Reviewing your recent workouts...');
  const [activeGoals, recentWorkouts, catalog] = await Promise.all([
    getActiveGoals(userId),
    getRecentWorkouts(userId, 10),
    queryCatalog({ limit: 200 }),
  ]);
  if (catalog.length === 0) throw new Error('No exercises in catalog');
  console.log('[AI flow] data loaded', {
    goals: activeGoals.length,
    recent: recentWorkouts.length,
    catalogSize: catalog.length,
  });
  const equipmentHint =
    equipmentTypes && equipmentTypes.length > 0
      ? `User's gym equipment: ${equipmentTypes.join(', ')}. Prefer exercises that use these when appropriate.`
      : undefined;
  onProgress('scanning_catalog', 'Scanning exercise catalog...');
  onProgress('balancing_muscles', 'Balancing muscle groups...');
  onProgress('optimizing_structure', 'Optimizing workout structure...');
  console.log('[AI flow] invoking Bedrock selectExercises');
  const selected = await selectExercises(
    userPrompt,
    catalog,
    recentWorkouts,
    activeGoals,
    bedrock,
    builderAiConfig,
    equipmentHint,
    userId
  );
  console.log('[AI flow] selectExercises returned', { count: selected.length });
  const validated = resolveSelectedToCatalog(selected, catalog);
  if (validated.length < selected.length) {
    console.log('[AI flow] resolution filtered some', {
      selectedCount: selected.length,
      validatedCount: validated.length,
      resolvedIds: validated.map((v) => v.exerciseId),
    });
  }
  if (validated.length === 0) {
    console.error('[AI flow] validation failed', {
      selectedIds: selected.map((e) => e.exerciseId),
      selectedNames: selected.map((e) => e.exerciseName),
      catalogIdsSample: catalog.slice(0, 5).map((c) => c.exerciseId),
    });
    throw new Error('No valid exercises selected');
  }

  if (builderSessionId) {
    const expiresAt = Math.floor(Date.now() / 1000) + 60 * 5;
    await ddb.send(
      new PutCommand({
        TableName: BUILDER_SESSIONS_TABLE,
        Item: {
          PK: `USER#${userId}`,
          SK: `SESSION#${builderSessionId}`,
          originalPrompt: userPrompt,
          createdAt: new Date().toISOString(),
          expiresAt,
          lastExerciseIds: validated.map((v) => v.exerciseId),
        } as Record<string, unknown>,
      })
    );
  }

  return validated.map((e, i) => ({ ...e, orderIndex: i }));
}

/** Regenerate flow: load full catalog; for each index, LLM picks replacement excluding current list. */
export async function runRegenerateFlow(
  currentExercises: WorkoutExercise[],
  ctx: RegenerateContext,
  userId: string,
  builderSessionId: string | undefined,
  bedrock: BedrockRuntimeClient,
  onProgress: (step: string, message: string) => void
): Promise<WorkoutExercise[]> {
  let effectiveUserPrompt = ctx.userPrompt;
  const builderAiConfig = await loadBuilderAiConfig();
  console.log('[AI regen] model and prompt', {
    modelId: builderAiConfig.bedrockModelId,
    userPrompt: effectiveUserPrompt ?? '(will load from session)',
  });

  if (builderSessionId) {
    const out = await ddb.send(
      new GetCommand({
        TableName: BUILDER_SESSIONS_TABLE,
        Key: { PK: `USER#${userId}`, SK: `SESSION#${builderSessionId}` },
      })
    );
    const session = out.Item as { originalPrompt?: string } | undefined;
    if (session?.originalPrompt && !effectiveUserPrompt) {
      effectiveUserPrompt = session.originalPrompt;
    }
  }

  const result = currentExercises.map((e) => ({ ...e }));
  const sortedIndices = [...ctx.exerciseIndices].sort((a, b) => a - b);
  const exclude = new Set(ctx.currentExerciseIds);
  const usedReplacementIds = new Set<string>();

  onProgress('scanning_catalog', 'Scanning exercise catalog...');
  const catalog = await queryCatalog({ limit: 200 });
  if (catalog.length === 0) throw new Error('No exercises in catalog');

  for (const idx of sortedIndices) {
    const excludeIds = [...exclude, ...usedReplacementIds];
    const replacements = await pickReplacementExercises(
      catalog,
      1,
      bedrock,
      builderAiConfig,
      { userPrompt: effectiveUserPrompt ?? '', excludeIds, userId }
    );
    const first = replacements[0];
    const valid =
      first && catalog.some((c) => c.exerciseId === first.exerciseId);
    const chosen = valid
      ? first
      : toWorkoutExerciseFromCatalog(
          catalog.find((c) => !exclude.has(c.exerciseId)) ?? catalog[0],
          0
        );

    if (exclude.has(chosen.exerciseId) || usedReplacementIds.has(chosen.exerciseId)) {
      const fallback =
        catalog.find(
          (c) => !exclude.has(c.exerciseId) && !usedReplacementIds.has(c.exerciseId)
        ) ?? catalog.find((c) => !exclude.has(c.exerciseId)) ?? catalog[0];
      const fallbackChosen = toWorkoutExerciseFromCatalog(fallback, 0);
      usedReplacementIds.add(fallbackChosen.exerciseId);
      result[idx] = { ...fallbackChosen, orderIndex: idx };
    } else {
      usedReplacementIds.add(chosen.exerciseId);
      result[idx] = { ...chosen, orderIndex: idx };
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
