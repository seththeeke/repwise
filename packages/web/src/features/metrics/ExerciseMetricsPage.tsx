import { useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { ExerciseMetricsList } from './ExerciseMetricsList';

export function ExerciseMetricsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="bg-gradient-to-b from-primary to-primary-dark px-4 pt-12 pb-8">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-semibold text-white">Exercise Metrics</h1>
          <div className="w-9" />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <ExerciseMetricsList />
      </div>
    </div>
  );
}
