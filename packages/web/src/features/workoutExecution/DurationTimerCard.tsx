import { Play, Pause } from 'lucide-react';

function formatMMSS(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface DurationTimerCardProps {
  durationSeconds: number;
  elapsedSeconds: number;
  isRunning: boolean;
  onStartPause: () => void;
  onComplete: () => void;
}

export function DurationTimerCard({
  durationSeconds,
  elapsedSeconds,
  isRunning,
  onStartPause,
  onComplete,
}: DurationTimerCardProps) {
  const remaining = Math.max(0, durationSeconds - elapsedSeconds);
  const isDone = remaining <= 0;

  return (
    <div className="text-center">
      <p className="text-gray-400 mb-4">Duration: {durationSeconds}s</p>
      <div className="bg-gray-800 rounded-2xl p-6 mb-4">
        <p className="text-5xl font-mono font-bold text-white">
          {formatMMSS(remaining)}
        </p>
      </div>
      {isDone ? (
        <button
          type="button"
          onClick={onComplete}
          className="px-8 py-3 rounded-xl font-semibold text-lg bg-accent-green hover:opacity-90 text-white transition-opacity"
        >
          Done
        </button>
      ) : (
        <button
          type="button"
          onClick={onStartPause}
          className={`px-8 py-3 rounded-xl font-semibold text-lg transition-colors flex items-center justify-center gap-2 mx-auto ${
            isRunning
              ? 'bg-accent-orange hover:bg-accent-orange/90 text-white'
              : 'bg-primary hover:bg-primary-dark text-white'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-5 h-5" /> Pause
            </>
          ) : (
            <>
              <Play className="w-5 h-5" /> Start Timer
            </>
          )}
        </button>
      )}
    </div>
  );
}
