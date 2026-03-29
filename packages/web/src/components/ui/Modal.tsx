import { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  /** `sheet` = bottom sheet on narrow viewports; `center` = centered dialog (matches complete-workout pattern). */
  variant?: 'sheet' | 'center';
}

export function Modal({ open, onClose, children, title, variant = 'sheet' }: ModalProps) {
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

  const isCenter = variant === 'center';

  return (
    <AnimatePresence>
      {open ? (
        <div
          className={
            isCenter
              ? 'fixed inset-0 z-50 flex items-center justify-center p-4'
              : 'fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4'
          }
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/50"
          />
          <motion.div
            initial={
              isCenter
                ? { scale: 0.96, opacity: 0 }
                : { y: '100%', opacity: 0.9 }
            }
            animate={isCenter ? { scale: 1, opacity: 1 } : { y: 0, opacity: 1 }}
            exit={
              isCenter
                ? { scale: 0.96, opacity: 0 }
                : { y: '100%', opacity: 0.9 }
            }
            transition={{ type: 'tween', duration: 0.2 }}
            className={
              isCenter
                ? 'relative w-full max-w-sm bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col'
                : 'relative w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-xl max-h-[90vh] overflow-hidden flex flex-col'
            }
            onClick={(e) => e.stopPropagation()}
          >
            {title ? (
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {title}
                </h2>
              </div>
            ) : null}
            <div className="overflow-auto flex-1">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
