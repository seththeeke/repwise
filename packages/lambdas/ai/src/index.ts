import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import {
  runFullFlow,
  runRegenerateFlow,
  type RegenerateContext,
} from './flows';
import type { WorkoutExercise } from '@repwise/shared';
import { WeightUnit } from '@repwise/shared';

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
  weightUnit?: 'LBS' | 'KG';
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
        console.log('[AI stream] regenerate flow', { indices: body.regenerateContext.exerciseIndices.length });
        const exercises = await runRegenerateFlow(
          body.currentExercises,
          body.regenerateContext,
          bedrock,
          onProgress
        );
        console.log('[AI stream] regenerate complete', { exercisesCount: exercises.length });
        writeSSE(responseStream, 'complete', { exercises });
      } else if (body.aiPrompt) {
        console.log('[AI stream] full flow', { promptLength: body.aiPrompt.length });
        const exercises = await runFullFlow(
          userId,
          body.aiPrompt,
          weightUnit,
          bedrock,
          onProgress
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

