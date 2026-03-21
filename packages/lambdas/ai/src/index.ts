import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import type { APIGatewayProxyEventV2WithJWTAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { GetCommand, PutCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import {
  runFullFlow,
  runRegenerateFlow,
  DEFAULT_BUILDER_AI_CONFIG,
  type RegenerateContext,
} from './flows';
import { BUILDER_AI_CONFIG_TABLE, ddb, WeightUnit } from '@repwise/shared';
import type { WorkoutExercise } from '@repwise/shared';
import * as res from '@repwise/shared';

interface LambdaResponseStream {
  write(chunk: string): void;
  setContentType(value: string): void;
  end(): void;
}

/** Injected by the Lambda Node.js runtime at runtime (not a requireable module). */
declare const awslambda: {
  streamifyResponse: (
    handler: (
      event: unknown,
      responseStream: LambdaResponseStream,
      context: unknown
    ) => Promise<void>
  ) => unknown;
};

/** Lambda Function URL request (no authorizer; we validate JWT in Lambda). */
export interface FunctionUrlRequest {
  requestContext: { http: { method: string; path: string }; requestId: string };
  headers: Record<string, string>;
  body: string | null;
  isBase64Encoded?: boolean;
}

export interface StreamBody {
  aiPrompt?: string;
  regenerateContext?: RegenerateContext;
  /** Full current exercises when using regenerateContext (to merge replacements). */
  currentExercises?: WorkoutExercise[];
  /** Optional session id to persist builder constraints across regenerate attempts. */
  builderSessionId?: string;
  weightUnit?: 'LBS' | 'KG';
  /** Gym equipment types to filter exercise catalog (e.g. from selected gym). */
  equipmentTypes?: string[];
}

const USER_POOL_ID = process.env.USER_POOL_ID!;
const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;

async function getUserIdFromEvent(event: FunctionUrlRequest): Promise<string> {
  const auth =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) throw new Error('Missing Authorization header');
  const { CognitoJwtVerifier } = await import('aws-jwt-verify');
  const verifier = CognitoJwtVerifier.create({
    userPoolId: USER_POOL_ID,
    tokenUse: 'id',
    clientId: CLIENT_ID,
  });
  const payload = await verifier.verify(token);
  const sub = payload.sub as string;
  if (!sub) throw new Error('Invalid token');
  return sub;
}

function writeSSE(
  stream: LambdaResponseStream,
  event: string,
  data: Record<string, unknown>
): void {
  stream.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export const streamHandler = awslambda.streamifyResponse(
  async (
    event: unknown,
    responseStream: LambdaResponseStream,
    _context: unknown
  ): Promise<void> => {
    const req = event as FunctionUrlRequest;
    responseStream.setContentType('text/event-stream; charset=utf-8');
    console.log('[AI stream] request', {
      method: req.requestContext?.http?.method,
      path: req.requestContext?.http?.path,
    });

    try {
      if (req.requestContext?.http?.method !== 'POST') {
        writeSSE(responseStream, 'error', { message: 'Method not allowed' });
        responseStream.end();
        return;
      }

      const userId = await getUserIdFromEvent(req);
      console.log('[AI stream] authenticated', { userId: userId.slice(0, 8) + '...' });
      let body: StreamBody = {};
      const rawBody = req.body;
      if (rawBody) {
        const decoded = req.isBase64Encoded
          ? Buffer.from(rawBody, 'base64').toString('utf8')
          : rawBody;
        try {
          body = JSON.parse(decoded) as StreamBody;
        } catch {
          writeSSE(responseStream, 'error', { message: 'Invalid JSON body' });
          responseStream.end();
          return;
        }
      }

      const bedrock = new BedrockRuntimeClient({});
      const weightUnit =
        body.weightUnit === 'KG' ? WeightUnit.KG : WeightUnit.LBS;

      const onProgress = (step: string, message: string) => {
        writeSSE(responseStream, 'progress', { step, message });
      };

      if (body.regenerateContext && body.currentExercises) {
        console.log('[AI stream] regenerate flow', {
          userPrompt: body.regenerateContext.userPrompt ?? '(from session)',
          indices: body.regenerateContext.exerciseIndices.length,
        });
        const exercises = await runRegenerateFlow(
          body.currentExercises,
          body.regenerateContext,
          userId,
          body.builderSessionId,
          bedrock,
          onProgress
        );
        console.log('[AI stream] regenerate complete', { exercisesCount: exercises.length });
        writeSSE(responseStream, 'complete', { exercises });
      } else if (body.aiPrompt) {
        console.log('[AI stream] full flow', {
          userPrompt: body.aiPrompt,
          promptLength: body.aiPrompt.length,
          equipmentTypes: body.equipmentTypes?.length,
        });
        const exercises = await runFullFlow(
          userId,
          body.aiPrompt,
          weightUnit,
          bedrock,
          onProgress,
          body.equipmentTypes,
          body.builderSessionId
        );
        console.log('[AI stream] full flow complete', { exercisesCount: exercises.length });
        writeSSE(responseStream, 'complete', { exercises });
      } else {
        writeSSE(responseStream, 'error', {
          message: 'Body must include aiPrompt or regenerateContext + currentExercises',
        });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[AI stream] error', { message, stack: err instanceof Error ? err.stack : undefined });
      writeSSE(responseStream, 'error', { message });
    } finally {
      responseStream.end();
      console.log('[AI stream] response ended');
    }
  }
);

function parseBody<T>(body: string | null): T | null {
  if (!body) return null;
  try {
    return JSON.parse(body) as T;
  } catch {
    return null;
  }
}

async function getUserGroupsFromAuthHeader(
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<string[]> {
  const auth =
    event.headers?.authorization ||
    event.headers?.Authorization ||
    '';
  const token = auth.replace(/^Bearer\s+/i, '').trim();
  if (!token) return [];

  const { CognitoJwtVerifier } = await import('aws-jwt-verify');
  const USER_POOL_ID = process.env.USER_POOL_ID!;
  const CLIENT_ID = process.env.COGNITO_CLIENT_ID!;

  const verifier = CognitoJwtVerifier.create({
    userPoolId: USER_POOL_ID,
    tokenUse: 'id',
    clientId: CLIENT_ID,
  });

  const payload = await verifier.verify(token);
  const raw = (payload as any)['cognito:groups'];
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((g) => String(g));
  return [String(raw)];
}

const BUILDER_AI_CONFIG_PK = 'BUILDER_AI_CONFIG';
const BUILDER_AI_CONFIG_SK = 'GLOBAL';

const USAGE_MODEL_IDS = [
  'amazon.nova-micro-v1:0',
  'amazon.nova-lite-v1:0',
  'amazon.nova-pro-v1:0',
  'amazon.nova-premier-v1:0',
  'anthropic.claude-3-5-haiku-20241022-v1:0',
  'anthropic.claude-sonnet-4-5-20250929-v1:0',
  'anthropic.claude-opus-4-5-20251101-v1:0',
];

/**
 * Admin: GET/PUT /admin/builder-ai-config, GET /admin/builder-ai-config/usage
 * Requires Cognito JWT group `builder-admin`.
 */
export const builderAiConfigHandler = async (
  event: APIGatewayProxyEventV2WithJWTAuthorizer
): Promise<APIGatewayProxyResultV2> => {
  const method = event.requestContext.http.method;
  const path = (event as { rawPath?: string }).rawPath ?? event.requestContext.http.path ?? '';

  const groups = await getUserGroupsFromAuthHeader(event);
  if (!groups.includes('builder-admin')) return res.forbidden();

  try {
    if (method === 'GET' && path.endsWith('/usage')) {
      const queryParams = event.queryStringParameters ?? {};
      const modelIdsParam = queryParams.modelIds;
      const modelIds = modelIdsParam
        ? modelIdsParam.split(',').map((s) => s.trim()).filter(Boolean)
        : USAGE_MODEL_IDS;

      const byModel: Record<string, {
        invocationCount: number;
        inputTokens: number;
        outputTokens: number;
        fullCount: number;
        regenerateCount: number;
      }> = {};
      let totalsInvocation = 0;
      let totalsInput = 0;
      let totalsOutput = 0;

      for (const modelId of modelIds) {
        const out = await ddb.send(
          new QueryCommand({
            TableName: BUILDER_AI_CONFIG_TABLE,
            KeyConditionExpression: 'PK = :pk',
            ExpressionAttributeValues: { ':pk': modelId },
          })
        );
        const items = (out.Items ?? []) as Array<{
          inputTokens?: number;
          outputTokens?: number;
          runType?: string;
        }>;
        let inputTokens = 0;
        let outputTokens = 0;
        let fullCount = 0;
        let regenerateCount = 0;
        for (const item of items) {
          inputTokens += item.inputTokens ?? 0;
          outputTokens += item.outputTokens ?? 0;
          if (item.runType === 'full') fullCount++;
          else if (item.runType === 'regenerate') regenerateCount++;
        }
        byModel[modelId] = {
          invocationCount: items.length,
          inputTokens,
          outputTokens,
          fullCount,
          regenerateCount,
        };
        totalsInvocation += items.length;
        totalsInput += inputTokens;
        totalsOutput += outputTokens;
      }

      return res.ok({
        byModel,
        totals: {
          invocationCount: totalsInvocation,
          inputTokens: totalsInput,
          outputTokens: totalsOutput,
        },
      });
    }

    if (method === 'GET') {
      const out = await ddb.send(
        new GetCommand({
          TableName: BUILDER_AI_CONFIG_TABLE,
          Key: { PK: BUILDER_AI_CONFIG_PK, SK: BUILDER_AI_CONFIG_SK },
        })
      );
      const item = out.Item as Partial<typeof DEFAULT_BUILDER_AI_CONFIG> | undefined;
      return res.ok({
        bedrockModelId: item?.bedrockModelId ?? DEFAULT_BUILDER_AI_CONFIG.bedrockModelId,
          estimatedPricePerRequest:
            item?.estimatedPricePerRequest ??
            DEFAULT_BUILDER_AI_CONFIG.estimatedPricePerRequest,
        intentPromptTemplate:
          item?.intentPromptTemplate ?? DEFAULT_BUILDER_AI_CONFIG.intentPromptTemplate,
        selectExercisesPromptTemplate:
          item?.selectExercisesPromptTemplate ?? DEFAULT_BUILDER_AI_CONFIG.selectExercisesPromptTemplate,
        regeneratePromptTemplate:
          item?.regeneratePromptTemplate ?? DEFAULT_BUILDER_AI_CONFIG.regeneratePromptTemplate,
      });
    }

    if (method === 'PUT') {
      const body = parseBody<Partial<{
        bedrockModelId: string;
          estimatedPricePerRequest: string;
        intentPromptTemplate: string;
        selectExercisesPromptTemplate: string;
        regeneratePromptTemplate: string;
      }>>(event.body ?? null);

      if (!body) return res.badRequest('Invalid JSON body');

      const current = await ddb.send(
        new GetCommand({
          TableName: BUILDER_AI_CONFIG_TABLE,
          Key: { PK: BUILDER_AI_CONFIG_PK, SK: BUILDER_AI_CONFIG_SK },
        })
      );
      const currentItem = (current.Item ?? {}) as Record<string, unknown>;

      const merged = {
        bedrockModelId:
          typeof body.bedrockModelId === 'string'
            ? body.bedrockModelId
            : (currentItem.bedrockModelId as string | undefined) ??
              DEFAULT_BUILDER_AI_CONFIG.bedrockModelId,
        estimatedPricePerRequest:
          typeof body.estimatedPricePerRequest === 'string'
            ? body.estimatedPricePerRequest
            : (currentItem.estimatedPricePerRequest as string | undefined) ??
              DEFAULT_BUILDER_AI_CONFIG.estimatedPricePerRequest,
        intentPromptTemplate:
          typeof body.intentPromptTemplate === 'string'
            ? body.intentPromptTemplate
            : (currentItem.intentPromptTemplate as string | undefined) ??
              DEFAULT_BUILDER_AI_CONFIG.intentPromptTemplate,
        selectExercisesPromptTemplate:
          typeof body.selectExercisesPromptTemplate === 'string'
            ? body.selectExercisesPromptTemplate
            : (currentItem.selectExercisesPromptTemplate as string | undefined) ??
              DEFAULT_BUILDER_AI_CONFIG.selectExercisesPromptTemplate,
        regeneratePromptTemplate:
          typeof body.regeneratePromptTemplate === 'string'
            ? body.regeneratePromptTemplate
            : (currentItem.regeneratePromptTemplate as string | undefined) ??
              DEFAULT_BUILDER_AI_CONFIG.regeneratePromptTemplate,
      };

      await ddb.send(
        new PutCommand({
          TableName: BUILDER_AI_CONFIG_TABLE,
          Item: {
            PK: BUILDER_AI_CONFIG_PK,
            SK: BUILDER_AI_CONFIG_SK,
            ...merged,
          } as Record<string, unknown>,
        })
      );

      return res.ok(merged);
    }

    return res.badRequest('Method not supported');
  } catch (err) {
    return res.serverError(err);
  }
};

