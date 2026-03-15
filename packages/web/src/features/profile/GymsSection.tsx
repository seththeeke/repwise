import { useQuery, useQueryClient } from '@tanstack/react-query';
import { gymsApi, type Gym } from '@/api/gyms';
import { usersApi } from '@/api/users';
import { Building2, Pencil, Trash2, Check } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';
import { GymFormSheet } from './GymFormSheet';
import { useState } from 'react';

export function GymsSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ['gyms'],
    queryFn: () => gymsApi.list(),
  });
  const [formOpen, setFormOpen] = useState(false);
  const [editGym, setEditGym] = useState<Gym | null>(null);

  const gyms = data?.gyms ?? [];
  const defaultGymId = data?.defaultGymId ?? null;

  const handleSetDefault = async (gymId: string) => {
    await usersApi.patchMe({ defaultGymId: gymId });
    queryClient.invalidateQueries({ queryKey: ['gyms'] });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  const handleAddGym = () => {
    setEditGym(null);
    setFormOpen(true);
  };

  const handleEditGym = (gym: Gym) => {
    setEditGym(gym);
    setFormOpen(true);
  };

  const handleDeleteGym = async (gym: Gym) => {
    if (!window.confirm(`Delete "${gym.name}"?`)) return;
    await gymsApi.delete(gym.gymId);
    queryClient.invalidateQueries({ queryKey: ['gyms'] });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  const handleSaved = () => {
    queryClient.invalidateQueries({ queryKey: ['gyms'] });
    queryClient.invalidateQueries({ queryKey: ['profile'] });
  };

  if (isLoading) {
    return (
      <div className="mt-6 flex justify-center py-4">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary" />
          My Gyms
        </h3>
        <button
          type="button"
          onClick={handleAddGym}
          className="text-sm font-medium text-primary hover:underline"
        >
          Add gym
        </button>
      </div>
      <div className="space-y-2">
        {gyms.length === 0 ? (
          <p className="text-sm text-gray-500 dark:text-gray-400 py-4">
            No gyms yet. Add one to tailor workouts to your equipment.
          </p>
        ) : (
          gyms.map((gym) => (
            <div
              key={gym.gymId}
              className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 flex items-center justify-between gap-3"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                  {gym.name}
                  {defaultGymId === gym.gymId && (
                    <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                      Default
                    </span>
                  )}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {(gym.equipmentTypes ?? []).join(', ')}
                </p>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                {defaultGymId !== gym.gymId && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(gym.gymId)}
                    className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                    title="Set as default"
                  >
                    <Check className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleEditGym(gym)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
                  title="Edit"
                >
                  <Pencil className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteGym(gym)}
                  className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4 text-red-500" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <GymFormSheet
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditGym(null); }}
        onSaved={handleSaved}
        editGym={editGym}
      />
    </div>
  );
}
