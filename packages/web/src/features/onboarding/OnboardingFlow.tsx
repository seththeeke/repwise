import { useState } from 'react';
import { gymsApi } from '@/api/gyms';
import { goalsApi, type GoalSuggestion } from '@/api/goals';
import { usersApi } from '@/api/users';
import { EQUIPMENT_TYPES, EQUIPMENT_LABELS, PRESETS, type EquipmentType } from '@/constants/equipment';
import {
  Dumbbell,
  Loader2,
  ChevronRight,
  Target,
  Weight,
  Link2,
  Layers,
  Activity,
  Settings,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

const EQUIPMENT_ICONS: Record<EquipmentType, LucideIcon> = {
  dumbbells: Dumbbell,
  free_weights: Weight,
  cables: Link2,
  weight_rack: Layers,
  cardio: Activity,
  machines: Settings,
};

type Step = 'equipment' | 'goals';

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>('equipment');
  const [equipmentSelected, setEquipmentSelected] = useState<Set<EquipmentType>>(new Set(EQUIPMENT_TYPES));
  const [goalsText, setGoalsText] = useState('');
  const [suggestions, setSuggestions] = useState<GoalSuggestion[]>([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggesting, setSuggesting] = useState(false);

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

  const handleSuggestGoals = async () => {
    if (!goalsText.trim()) return;
    setError(null);
    setSuggesting(true);
    try {
      const res = await goalsApi.suggestFromText(goalsText.trim());
      const list = res.suggestions ?? [];
      setSuggestions(list);
      setSelectedSuggestions(new Set(list.map((_, i) => i)));
    } catch {
      setError('Could not generate suggestions. Try again or skip.');
    } finally {
      setSuggesting(false);
    }
  };

  const toggleSuggestion = (index: number) => {
    setSelectedSuggestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const createSelectedGoals = async () => {
    const toCreate = Array.from(selectedSuggestions)
      .sort((a, b) => a - b)
      .map((i) => suggestions[i])
      .filter(Boolean);
    for (const s of toCreate) {
      await goalsApi.create({
        type: s.type,
        title: s.title,
        timeframe: s.timeframe,
        targetValue: s.targetValue,
        unit: s.unit,
      });
    }
  };

  const handleFinish = async () => {
    setError(null);
    setLoading(true);
    try {
      const equipmentTypes = equipmentSelected.size > 0
        ? Array.from(equipmentSelected)
        : EQUIPMENT_TYPES.slice();
      const created = await gymsApi.create({
        name: 'My Gym',
        equipmentTypes,
      });
      if (suggestions.length > 0 && selectedSuggestions.size > 0) {
        await createSelectedGoals();
      }
      await usersApi.patchMe({
        defaultGymId: created.gymId,
        onboardingCompletedAt: new Date().toISOString(),
      });
      onComplete();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'equipment') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="bg-gradient-to-b from-primary to-primary-dark px-4 pt-12 pb-8">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <Dumbbell className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">What equipment do you have?</h1>
          <p className="text-white/80 text-sm mt-1">Optional, you can change this later from your profile if you want</p>
        </div>
        <div className="flex-1 px-4 py-6 space-y-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => applyPreset('commercial')}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Commercial Gym
            </button>
            <button
              type="button"
              onClick={() => applyPreset('home')}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Home Gym
            </button>
            <button
              type="button"
              onClick={() => applyPreset('minimalist')}
              className="px-3 py-1.5 rounded-lg bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Minimalist
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {EQUIPMENT_TYPES.map((type) => {
              const Icon = EQUIPMENT_ICONS[type];
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => toggleEquipment(type)}
                  className={`p-4 rounded-xl border-2 text-left transition-colors flex items-center gap-3 ${
                    equipmentSelected.has(type)
                      ? 'border-primary bg-primary/10 dark:bg-primary/20'
                      : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800'
                  }`}
                >
                  <span className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center text-gray-600 dark:text-gray-300">
                    <Icon className="w-5 h-5" />
                  </span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {EQUIPMENT_LABELS[type]}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setStep('goals')}
              className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2"
            >
              Next
              <ChevronRight className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => { setEquipmentSelected(new Set(EQUIPMENT_TYPES)); setStep('goals'); }}
              className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium"
            >
              Skip
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'goals') {
    if (loading) {
      return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center">
          <Loader2 className="w-10 h-10 animate-spin text-primary" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Setting up...</p>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
        <div className="bg-gradient-to-b from-primary to-primary-dark px-4 pt-12 pb-8">
          <div className="w-14 h-14 bg-white/20 rounded-2xl flex items-center justify-center mb-4">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Your goals</h1>
          <p className="text-white/80 text-sm mt-1">Describe your fitness goals in a few words. We&apos;ll turn them into trackable goals.</p>
        </div>
        <div className="flex-1 px-4 py-6 space-y-4">
          <textarea
            value={goalsText}
            onChange={(e) => setGoalsText(e.target.value)}
            placeholder="e.g. I want to workout 3x per week and hit 12 workouts this month"
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white min-h-[100px]"
            rows={4}
          />
          {suggestions.length === 0 ? (
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleSuggestGoals}
                disabled={!goalsText.trim() || suggesting}
                className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {suggesting ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create goals'}
              </button>
              <button
                type="button"
                onClick={() => handleFinish()}
                className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 font-medium"
              >
                Skip
              </button>
            </div>
          ) : (
            <>
              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Suggested goals (select to create):</p>
                {suggestions.map((s, i) => (
                  <label
                    key={i}
                    className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSuggestions.has(i)}
                      onChange={() => toggleSuggestion(i)}
                      className="rounded border-gray-300"
                    />
                    <span className="font-medium text-gray-900 dark:text-white">{s.title}</span>
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {s.targetValue} {s.unit ?? ''} · {s.timeframe}
                    </span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => handleFinish()}
                  className="flex-1 py-3 rounded-xl bg-primary text-white font-semibold flex items-center justify-center gap-2"
                >
                  Next
                  <ChevronRight className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => { setSuggestions([]); setGoalsText(''); }}
                  className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 text-sm"
                >
                  Clear
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  return null;
}
