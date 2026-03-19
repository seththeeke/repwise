import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Settings2, Sparkles } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { builderAiConfigApi } from '@/api/builderAiConfig';

export function AdminHomePage() {
  const navigate = useNavigate();

  const { data, isLoading, error } = useQuery({
    queryKey: ['builderAiConfig', 'admin-check'],
    queryFn: builderAiConfigApi.get,
    retry: 0,
  });

  const isForbidden = (err: unknown): boolean => {
    const anyErr = err as any;
    return anyErr?.response?.status === 403;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <Spinner />
      </div>
    );
  }

  if (error && isForbidden(error) && !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 text-center">
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
            Path not found
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-300 mt-2">
            You may not have access to this page.
          </p>
          <button
            type="button"
            onClick={() => navigate('/dashboard')}
            className="mt-5 py-2 px-4 rounded-lg bg-primary hover:bg-primary-dark text-white font-medium transition-colors"
          >
            Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="bg-gradient-to-b from-primary to-primary-dark px-4 pt-12 pb-6">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white flex items-center gap-2">
            <Settings2 className="w-5 h-5" />
            Admin
          </h1>
          <div className="w-9" />
        </div>
        <p className="text-sm text-white/80 mt-3 max-w-lg">
          Manage the AI workout builder prompts and model used for generations.
        </p>
      </div>

      <div className="px-4 py-6 space-y-3">
        <button
          type="button"
          onClick={() => navigate('/admin/builder-ai')}
          className="w-full text-left bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-4 hover:shadow-md transition-shadow flex items-start gap-3"
        >
          <div className="mt-0.5">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 dark:text-white">
              Workout Builder AI
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Edit intent/selection/regeneration prompt templates and Bedrock model
              ID at runtime.
            </p>
          </div>
        </button>
      </div>
    </div>
  );
}

