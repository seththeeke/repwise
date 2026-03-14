import { X, Timer, Play, Pause, SkipForward } from 'lucide-react';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

interface ExecutionHeaderProps {
  elapsedSeconds: number;
  isPaused: boolean;
  onPauseResume: () => void;
  onCancel: () => void;
  onSkip: () => void;
}

export function ExecutionHeader({
  elapsedSeconds,
  isPaused,
  onPauseResume,
  onCancel,
  onSkip,
}: ExecutionHeaderProps) {
  return (
    <div className="flex items-center justify-between p-4">
      <button
        type="button"
        onClick={onCancel}
        className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
        aria-label="Cancel workout"
      >
        <X className="w-6 h-6" />
      </button>

      <div className="flex items-center gap-2 bg-gray-800 px-4 py-2 rounded-full">
        <Timer className="w-4 h-4 text-primary" />
        <span className="font-mono text-lg">{formatTime(elapsedSeconds)}</span>
        <button
          type="button"
          onClick={onPauseResume}
          className="ml-2 p-1 hover:bg-gray-700 rounded"
          aria-label={isPaused ? 'Resume' : 'Pause'}
        >
          {isPaused ? <Play className="w-4 h-4" /> : <Pause className="w-4 h-4" />}
        </button>
      </div>

      <button
        type="button"
        onClick={onSkip}
        className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-800 hover:bg-gray-700 transition-colors"
        aria-label="Skip to next"
      >
        <SkipForward className="w-5 h-5" />
      </button>
    </div>
  );
}
