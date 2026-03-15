import { useState, useEffect } from 'react';
import { gymsApi, type Gym } from '@/api/gyms';
import { EQUIPMENT_TYPES, EQUIPMENT_LABELS, PRESETS, type EquipmentType } from '@/constants/equipment';
import { X } from 'lucide-react';

interface GymFormSheetProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editGym: Gym | null;
}

export function GymFormSheet({ open, onClose, onSaved, editGym }: GymFormSheetProps) {
  const [name, setName] = useState('');
  const [equipmentSelected, setEquipmentSelected] = useState<Set<EquipmentType>>(new Set(EQUIPMENT_TYPES));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editGym) {
      setName(editGym.name);
      setEquipmentSelected(new Set((editGym.equipmentTypes || []) as EquipmentType[]));
    } else {
      setName('');
      setEquipmentSelected(new Set(EQUIPMENT_TYPES));
    }
  }, [editGym, open]);

  const toggleEquipment = (type: EquipmentType) => {
    setEquipmentSelected((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const applyPreset = (presetKey: keyof typeof PRESETS) => {
    setEquipmentSelected(new Set(PRESETS[presetKey]));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    setSaving(true);
    try {
      const equipmentTypes = Array.from(equipmentSelected);
      if (editGym) {
        await gymsApi.update(editGym.gymId, { name: name.trim(), equipmentTypes });
      } else {
        await gymsApi.create({ name: name.trim(), equipmentTypes });
      }
      onSaved();
      onClose();
    } catch {
      setError('Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl w-full max-w-md max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {editGym ? 'Edit gym' : 'Add gym'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g. Home Gym"
              required
            />
          </div>
          <div>
            <p className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Equipment
            </p>
            <div className="flex flex-wrap gap-2 mb-2">
              {(['commercial', 'home', 'minimalist'] as const).map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => applyPreset(key)}
                  className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  {key === 'commercial' ? 'Commercial Gym' : key === 'home' ? 'Home Gym' : 'Minimalist'}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {EQUIPMENT_TYPES.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleEquipment(type)}
                  className={`p-3 rounded-xl border-2 text-left text-sm font-medium transition-colors ${
                    equipmentSelected.has(type)
                      ? 'border-primary bg-primary/10 dark:bg-primary/20'
                      : 'border-gray-200 dark:border-gray-600'
                  }`}
                >
                  {EQUIPMENT_LABELS[type]}
                </button>
              ))}
            </div>
          </div>
          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 rounded-xl bg-primary text-white font-semibold disabled:opacity-50"
          >
            {saving ? 'Saving...' : editGym ? 'Save changes' : 'Add gym'}
          </button>
        </form>
      </div>
    </div>
  );
}
