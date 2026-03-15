import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Wand2, Plus, History, ChevronDown } from 'lucide-react';
import { gymsApi } from '@/api/gyms';

export function NewWorkoutScreen() {
  const navigate = useNavigate();
  const { data: gymsData } = useQuery({
    queryKey: ['gyms'],
    queryFn: () => gymsApi.list(),
  });
  const gyms = gymsData?.gyms ?? [];
  const defaultGymId = gymsData?.defaultGymId ?? null;
  const [selectedGymId, setSelectedGymId] = useState<string | null>(null);
  const selectedGym = gyms.find((g) => g.gymId === (selectedGymId ?? defaultGymId)) ?? gyms[0];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <div className="flex items-center gap-4 p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <button
          type="button"
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
          New Workout
        </h1>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center p-6">
        {gyms.length > 0 && (
          <div className="relative inline-flex items-center justify-center mb-4">
            <select
              value={selectedGymId ?? defaultGymId ?? gyms[0]?.gymId ?? ''}
              onChange={(e) => setSelectedGymId(e.target.value || null)}
              className="bg-transparent border-0 text-gray-500 dark:text-gray-400 text-sm cursor-pointer appearance-none py-1 pl-0 pr-5 focus:outline-none focus:ring-0 hover:text-gray-700 dark:hover:text-gray-300"
              style={{ backgroundImage: 'none' }}
            >
              {gyms.map((g) => (
                <option key={g.gymId} value={g.gymId}>
                  {g.name}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-0 w-4 h-4 text-gray-400 dark:text-gray-500" />
          </div>
        )}

        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
          Create Workout
        </h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8 text-center">
          How would you like to build your workout?
        </p>

        <div className="w-full max-w-sm space-y-4">
          <button
            type="button"
            onClick={() =>
              navigate('/workout/new/ai', {
                state: selectedGym
                  ? { gym: { gymId: selectedGym.gymId, name: selectedGym.name, equipmentTypes: selectedGym.equipmentTypes ?? [] } }
                  : undefined,
              })
            }
            className="w-full p-6 bg-gradient-to-r from-primary to-primary-dark rounded-2xl shadow-lg shadow-primary/30 text-left hover:scale-[1.02] transition-transform"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                <Wand2 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-white text-lg">AI Generate</h3>
                <p className="text-violet-200 text-sm">
                  Let AI create your workout from a prompt
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/workout/new/manual')}
            className="w-full p-6 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 text-left hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                <Plus className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                  Manual Build
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Pick exercises yourself
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigate('/workouts?from=builder')}
            className="w-full p-6 bg-white dark:bg-gray-800 rounded-2xl shadow border border-gray-200 dark:border-gray-700 text-left hover:border-primary/50 transition-colors"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center">
                <History className="w-6 h-6 text-gray-600 dark:text-gray-300" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
                  Choose from past workout
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm">
                  Redo a previous workout
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
