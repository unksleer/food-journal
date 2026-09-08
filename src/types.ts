export type Meal = 'B' | 'L' | 'D' | 'S';
export type EntryKind = 'protein' | 'carb' | 'fat';
export type ProteinTier = 'VLP' | 'LP' | 'MP';
export type CarbTier = 'NSV' | 'SV' | 'F' | 'G';
export type Tier = ProteinTier | CarbTier | 'FAT';
export type KetoneMethod = 'blood' | 'breath' | 'strips';
export type WeightUnit = 'lb' | 'kg';

export interface Entry {
  id: string;
  kind: EntryKind;
  name: string;
  tier?: Tier;
  amount: number;
  unit: string;
  /** protein: kcal, carb: net carbs (g), fat: fat (g) */
  value: number;
  meal: Meal;
  createdAt: number;
}

export interface Activity {
  id: string;
  type: string;
  duration: string;
  calories?: string;
}

export interface Checkin {
  ketones?: number;
  ketoneMethod?: KetoneMethod;
  weight?: number;
  energy?: number;
  hunger?: number;
  sleep?: number;
  savedAt?: number;
}

export interface DayLog {
  date: string;
  entries: Entry[];
  water: number;
  activities: Activity[];
  notes: string;
  checkin: Checkin;
  /** Last local edit, used to resolve iCloud conflicts (newest wins). */
  updatedAt?: number;
}

export interface Favorite {
  id: string;
  kind: EntryKind;
  name: string;
  tier?: Tier;
  amount: number;
  unit: string;
  value: number;
}

export interface Reminders {
  morning: boolean;
  morningTime: string;
  evening: boolean;
  eveningTime: string;
}

export interface Integrations {
  icloud: boolean;
  health: boolean;
  healthWriteWeight: boolean;
  healthReadActivity: boolean;
  barcode: boolean;
  widget: boolean;
}

export const DEFAULT_INTEGRATIONS: Integrations = {
  icloud: false,
  health: false,
  healthWriteWeight: true,
  healthReadActivity: true,
  barcode: false,
  widget: false,
};

export interface Settings {
  proteinGoal: number;
  carbLimit: number;
  waterGoal: number;
  weightUnit: WeightUnit;
  ketoneMethod: KetoneMethod;
  favorites: Favorite[];
  reminders: Reminders;
  integrations: Integrations;
  onboardedAt?: number;
  reviewRequestedAt?: number;
  /** Bumped on every targets/favorites change, for iCloud conflict resolution. */
  settingsUpdatedAt?: number;
}

export type View = 'today' | 'trends' | 'history' | 'settings' | 'checkin' | 'onboarding';

export const MEALS: { key: Meal; label: string }[] = [
  { key: 'B', label: 'Breakfast' },
  { key: 'L', label: 'Lunch' },
  { key: 'D', label: 'Dinner' },
  { key: 'S', label: 'Snack' },
];

export function emptyDay(date: string): DayLog {
  return { date, entries: [], water: 0, activities: [], notes: '', checkin: {} };
}

export const DEFAULT_SETTINGS: Settings = {
  proteinGoal: 950,
  carbLimit: 40,
  waterGoal: 8,
  weightUnit: 'lb',
  ketoneMethod: 'blood',
  favorites: [],
  reminders: { morning: false, morningTime: '07:30', evening: false, eveningTime: '19:30' },
  integrations: DEFAULT_INTEGRATIONS,
};

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
}
