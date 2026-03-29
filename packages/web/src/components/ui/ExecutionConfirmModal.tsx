import { useEffect, type ReactNode } from 'react';

export interface ExecutionConfirmModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children?: ReactNode;
  secondaryLabel: string;
  onSecondary: () => void;
  primaryLabel: string;
  onPrimary: () => void;
  /** Green (complete) or red (destructive cancel). */
  primaryTone: 'success' | 'danger';
}

/**
 * Centered dark dialog for workout execution (complete / cancel).
 * Matches the “Complete Workout?” visual style.
 */
export function ExecutionConfirmModal({
  open,
  onClose,
  title,
  children,
  secondaryLabel,
  onSecondary,
  primaryLabel,
  onPrimary,
  primaryTone,
}: ExecutionConfirmModalProps) {
  useEffect(() => {
    if (!open) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  const primaryClass =
    primaryTone === 'success'
      ? 'bg-accent-green hover:opacity-90 transition-opacity'
      : 'bg-red-600 hover:bg-red-700 transition-colors';

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="execution-confirm-title"
        className="bg-gray-800 rounded-2xl p-6 w-full max-w-sm text-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 id="execution-confirm-title" className="text-xl font-bold mb-2">
          {title}
        </h2>
        {children != null && <div className="mb-4 space-y-2">{children}</div>}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onSecondary}
            className="flex-1 py-3 rounded-xl bg-gray-700 font-semibold hover:bg-gray-600 transition-colors text-white"
          >
            {secondaryLabel}
          </button>
          <button
            type="button"
            onClick={onPrimary}
            className={`flex-1 py-3 rounded-xl font-semibold text-white ${primaryClass}`}
          >
            {primaryLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
