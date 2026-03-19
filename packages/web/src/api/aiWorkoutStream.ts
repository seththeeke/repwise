import { fetchAuthSession } from 'aws-amplify/auth';
import type { WorkoutExercise } from '@/types';

const AI_STREAM_URL = import.meta.env.VITE_AI_WORKOUT_STREAM_URL as string | undefined;

export type ProgressStep =
  | 'analyzing_goals'
  | 'reviewing_history'
  | 'scanning_catalog'
  | 'balancing_muscles'
  | 'optimizing_structure';

export interface ProgressEvent {
  step: ProgressStep;
  message: string;
}

export interface RegenerateContext {
  exerciseIndices: number[];
  currentExerciseIds: string[];
  targetMuscleGroups?: string[];
  /**
   * Original user prompt used to keep regeneration aligned with intent.
   * Optional for backward compatibility.
   */
  userPrompt?: string;
  /**
   * Equipment constraints to filter the candidate set before regenerating.
   * May include gym equipment categories (e.g. "free_weights") or catalog tokens (e.g. "barbell").
   */
  equipmentTypes?: string[];
}

export interface StreamCallbacks {
  onProgress?: (step: ProgressStep, message: string) => void;
  onComplete: (exercises: WorkoutExercise[]) => void;
  onError: (message: string) => void;
}

function getStreamUrl(): string {
  if (!AI_STREAM_URL?.trim()) {
    throw new Error('VITE_AI_WORKOUT_STREAM_URL is not configured');
  }
  return AI_STREAM_URL.trim();
}

async function getAuthToken(): Promise<string> {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new Error('Not authenticated');
  return token;
}

function parseSSE(buffer: string): Array<{ event: string; data: string }> {
  const lines = buffer.split('\n');
  const out: Array<{ event: string; data: string }> = [];
  let event = '';
  let data = '';
  for (const line of lines) {
    if (line.startsWith('event:')) {
      event = line.slice(6).trim();
    } else if (line.startsWith('data:')) {
      data = line.slice(5).trim();
    } else if (line === '' && event && data) {
      out.push({ event, data });
      event = '';
      data = '';
    }
  }
  if (event && data) out.push({ event, data });
  return out;
}

/**
 * Stream AI workout generation from the SSE endpoint.
 * Calls onProgress for each step, onComplete with exercises, or onError.
 */
export async function streamWorkoutGeneration(
  aiPrompt: string,
  callbacks: StreamCallbacks,
  options?: {
    weightUnit?: 'LBS' | 'KG';
    equipmentTypes?: string[];
    builderSessionId?: string;
  }
): Promise<void> {
  const url = getStreamUrl();
  const token = await getAuthToken();
  const body = JSON.stringify({
    aiPrompt: aiPrompt.trim(),
    weightUnit: options?.weightUnit,
    equipmentTypes: options?.equipmentTypes,
    builderSessionId: options?.builderSessionId,
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    callbacks.onError(text || `Request failed: ${res.status}`);
    return;
  }
  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError('No response body');
    return;
  }
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = parseSSE(buffer);
      for (const ev of events) {
        if (ev.event === 'progress') {
          try {
            const payload = JSON.parse(ev.data) as ProgressEvent;
            callbacks.onProgress?.(payload.step, payload.message);
          } catch {
            // ignore parse
          }
        } else if (ev.event === 'complete') {
          try {
            const payload = JSON.parse(ev.data) as { exercises: WorkoutExercise[] };
            callbacks.onComplete(payload.exercises ?? []);
          } catch {
            callbacks.onError('Invalid complete payload');
          }
          return;
        } else if (ev.event === 'error') {
          try {
            const payload = JSON.parse(ev.data) as { message?: string };
            callbacks.onError(payload.message ?? 'Unknown error');
          } catch {
            callbacks.onError(ev.data || 'Unknown error');
          }
          return;
        }
      }
      buffer = buffer.includes('\n\n') ? buffer.slice(buffer.lastIndexOf('\n\n') + 2) : buffer;
    }
    callbacks.onError('Stream ended without complete or error');
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : 'Stream failed');
  }
}

/**
 * Stream regenerate for selected exercises.
 * Sends regenerateContext + currentExercises; onComplete receives full updated list.
 */
export async function streamWorkoutRegenerate(
  regenerateContext: RegenerateContext,
  currentExercises: WorkoutExercise[],
  callbacks: StreamCallbacks,
  options?: { builderSessionId?: string }
): Promise<void> {
  const url = getStreamUrl();
  const token = await getAuthToken();
  const body = JSON.stringify({
    regenerateContext,
    currentExercises,
    builderSessionId: options?.builderSessionId,
  });
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    callbacks.onError(text || `Request failed: ${res.status}`);
    return;
  }
  const reader = res.body?.getReader();
  if (!reader) {
    callbacks.onError('No response body');
    return;
  }
  const decoder = new TextDecoder();
  let buffer = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const events = parseSSE(buffer);
      for (const ev of events) {
        if (ev.event === 'progress') {
          try {
            const payload = JSON.parse(ev.data) as ProgressEvent;
            callbacks.onProgress?.(payload.step, payload.message);
          } catch {
            // ignore
          }
        } else if (ev.event === 'complete') {
          try {
            const payload = JSON.parse(ev.data) as { exercises: WorkoutExercise[] };
            callbacks.onComplete(payload.exercises ?? []);
          } catch {
            callbacks.onError('Invalid complete payload');
          }
          return;
        } else if (ev.event === 'error') {
          try {
            const payload = JSON.parse(ev.data) as { message?: string };
            callbacks.onError(payload.message ?? 'Unknown error');
          } catch {
            callbacks.onError(ev.data || 'Unknown error');
          }
          return;
        }
      }
      buffer = buffer.includes('\n\n') ? buffer.slice(buffer.lastIndexOf('\n\n') + 2) : buffer;
    }
    callbacks.onError('Stream ended without complete or error');
  } catch (err) {
    callbacks.onError(err instanceof Error ? err.message : 'Stream failed');
  }
}

export const AI_PROGRESS_STEPS: { step: ProgressStep; label: string }[] = [
  { step: 'analyzing_goals', label: 'Analyzing your fitness goals...' },
  { step: 'reviewing_history', label: 'Reviewing your recent workouts...' },
  { step: 'scanning_catalog', label: 'Scanning exercise catalog...' },
  { step: 'balancing_muscles', label: 'Balancing muscle groups...' },
  { step: 'optimizing_structure', label: 'Optimizing workout structure...' },
];
