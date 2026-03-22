import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Settings2 } from 'lucide-react';
import { builderAiConfigApi } from '@/api/builderAiConfig';

function isForbiddenError(err: unknown): boolean {
  const anyErr = err as any;
  return anyErr?.response?.status === 403;
}

export function AdminFloatingButton({
  className,
}: {
  className?: string;
}) {
  const navigate = useNavigate();

  const { data, error } = useQuery({
    queryKey: ['builderAiConfig', 'admin-check', 'floating-nav'],
    queryFn: builderAiConfigApi.get,
    retry: 0,
  });

  const canAccessAdmin = useMemo(() => {
    if (data) return true;
    if (error && isForbiddenError(error)) return false;
    return false;
  }, [data, error]);

  if (!canAccessAdmin) return null;

  return (
    <button
      type="button"
      onClick={() => navigate('/admin')}
      className={[
        'fixed z-20 w-14 h-14 bg-primary hover:bg-primary-dark rounded-full shadow-lg shadow-primary/40 flex items-center justify-center transition-all hover:scale-105 active:scale-95',
        'bottom-[max(1.5rem,env(safe-area-inset-bottom))]',
        className ?? 'left-6',
      ].join(' ')}
      aria-label="Admin"
      title="Admin"
    >
      <Settings2 className="w-7 h-7 text-white" />
    </button>
  );
}

