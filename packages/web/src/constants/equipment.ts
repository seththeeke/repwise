/** Equipment type IDs stored on a Gym. Must align with exercise catalog equipment values. */
export const EQUIPMENT_TYPES = [
  'dumbbells',
  'free_weights',
  'cables',
  'weight_rack',
  'cardio',
  'machines',
] as const;

export type EquipmentType = (typeof EQUIPMENT_TYPES)[number];

export const EQUIPMENT_LABELS: Record<EquipmentType, string> = {
  dumbbells: 'Dumbbells',
  free_weights: 'Free Weights',
  cables: 'Cables',
  weight_rack: 'Weight Rack',
  cardio: 'Cardio',
  machines: 'Machines',
};

export const PRESETS: Record<string, EquipmentType[]> = {
  commercial: EQUIPMENT_TYPES.slice(),
  home: ['dumbbells', 'free_weights', 'cardio'],
  minimalist: ['dumbbells'],
};
