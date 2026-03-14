import { Modal } from '@/components/ui/Modal';

interface CancelWorkoutModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function CancelWorkoutModal({ open, onClose, onConfirm }: CancelWorkoutModalProps) {
  return (
    <Modal open={open} onClose={onClose} title="Cancel workout?">
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        Your progress will not be saved.
      </p>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 rounded-xl bg-gray-200 dark:bg-gray-700 font-semibold text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
        >
          Keep Going
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="flex-1 py-3 rounded-xl bg-red-600 font-semibold text-white hover:bg-red-700 transition-colors"
        >
          Cancel Workout
        </button>
      </div>
    </Modal>
  );
}
