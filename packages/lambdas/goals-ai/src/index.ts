import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';
import { getUserId } from '@repwise/shared';
import * as res from '@repwise/shared';
import { GoalType, GoalTimeframe } from '@repwise/shared';

const BEDROCK_MODEL = 'amazon.nova-micro-v1:0';

export interface GoalSuggestion {
  type: GoalType;
  title: string;
  timeframe: GoalTimeframe;
  targetValue: number;
  unit?: string;
}

function parseBody<T>(body: string | null): T | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

const VALID_TYPES = Object.values(GoalType);
const VALID_TIMEFRAMES = Object.values(GoalTimeframe);

function validateSuggestions(items: unknown): GoalSuggestion[] {
  if (!Array.isArray(items)) return [];
  const result: GoalSuggestion[] = [];
  for (const item of items) {
    if (item == null || typeof item !== 'object') continue;
    const o = item as Record<string, unknown>;
    const type = o.type as string;
    const title = typeof o.title === 'string' ? o.title.trim() : '';
    const timeframe = o.timeframe as string;
    const targetValue = typeof o.targetValue === 'number' ? o.targetValue : Number(o.targetValue);
    if (!VALID_TYPES.includes(type as GoalType) || !title || !VALID_TIMEFRAMES.includes(timeframe as GoalTimeframe)) continue;
    if (Number.isNaN(targetValue) || targetValue < 1) continue;
    result.push({
      type: type as GoalType,
      title,
      timeframe: timeframe as GoalTimeframe,
      targetValue: Math.round(targetValue),
      unit: typeof o.unit === 'string' ? o.unit.trim() || undefined : undefined,
    });
  }
  return result;
}

export const handler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = event.rawPath ?? event.requestContext.http.path ?? '';
  console.log('[goals-ai] request', { method, path });

  if (method !== 'POST' || path !== '/goals/me/suggest') {
    return res.badRequest('Not found');
  }

  try {
    const userId = getUserId(event);
    const body = parseBody<{ freeText?: string }>(event.body ?? null);
    const freeText = body?.freeText;
    if (typeof freeText !== 'string' || !freeText.trim()) {
      return res.badRequest('freeText (string) required');
    }

    const prompt = `You are a fitness goal assistant. Given the user's goal description below, return ONLY a JSON array of goal suggestions. Each suggestion must have: "type", "title", "timeframe", "targetValue", and optionally "unit".

Allowed "type" values (use exactly these): ${VALID_TYPES.join(', ')}
Allowed "timeframe" values: ${VALID_TIMEFRAMES.join(', ')}

For each goal:
- type: one of the allowed types (e.g. total_workouts, workouts_per_week, workout_streak, total_volume, one_rep_max, exercise_sessions).
- title: short human-readable title (e.g. "Complete 12 workouts this month").
- timeframe: weekly, monthly, quarterly, yearly, or all_time.
- targetValue: positive number (e.g. 12 for 12 workouts).
- unit: optional string (e.g. "workouts", "lbs") for display.

Return ONLY the JSON array, no markdown or explanation. Example: [{"type":"total_workouts","title":"Hit 12 workouts this month","timeframe":"monthly","targetValue":12,"unit":"workouts"}]

User's goal description: "${freeText.trim()}"`;

    const bedrock = new BedrockRuntimeClient({});
    const response = await bedrock.send(
      new ConverseCommand({
        modelId: BEDROCK_MODEL,
        messages: [{ role: 'user', content: [{ text: prompt }] }],
        inferenceConfig: { maxTokens: 1024, temperature: 0.3 },
      })
    );
    const text = (response.output?.message?.content ?? [])
      .map((b: { text?: string }) => b.text ?? '')
      .filter(Boolean)
      .join('');
    const cleaned = text.replace(/```\w*\n?/g, '').trim();
    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      console.warn('[goals-ai] Bedrock response not valid JSON', { text: text.slice(0, 200) });
      return res.ok({ suggestions: [] });
    }
    const suggestions = validateSuggestions(parsed);
    return res.ok({ suggestions });
  } catch (err) {
    console.error('[goals-ai] handler error', { error: err, message: err instanceof Error ? err.message : String(err) });
    return res.serverError(err);
  }
};
