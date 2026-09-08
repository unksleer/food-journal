import type { DayLog, Entry, EntryKind, Favorite, Tier } from '../types';

export interface FoodSuggestion {
  key: string;
  kind: EntryKind;
  name: string;
  tier?: Tier;
  amount: number;
  unit: string;
  value: number;
  /** How many times it has been logged. */
  count: number;
  lastUsed: number;
  favorite: boolean;
}

function norm(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Builds the suggestion pool from favorites and every logged entry, newest first. */
export function buildFoodIndex(days: Record<string, DayLog>, favorites: Favorite[]): FoodSuggestion[] {
  const map = new Map<string, FoodSuggestion>();
  const add = (e: Pick<Entry, 'kind' | 'name' | 'tier' | 'amount' | 'unit' | 'value'>, when: number, favorite: boolean) => {
    const key = `${e.kind}:${norm(e.name)}`;
    if (!key.endsWith(':')) {
      const cur = map.get(key);
      if (cur) {
        cur.count += 1;
        if (when > cur.lastUsed) {
          cur.lastUsed = when;
          cur.tier = e.tier;
          cur.amount = e.amount;
          cur.unit = e.unit;
          cur.value = e.value;
          cur.name = e.name.trim();
        }
        cur.favorite = cur.favorite || favorite;
      } else {
        map.set(key, { key, kind: e.kind, name: e.name.trim(), tier: e.tier, amount: e.amount, unit: e.unit, value: e.value, count: 1, lastUsed: when, favorite });
      }
    }
  };
  for (const day of Object.values(days)) {
    for (const e of day.entries) add(e, e.createdAt || 0, false);
  }
  for (const f of favorites) add(f, Number.MAX_SAFE_INTEGER, true);
  return [...map.values()];
}

/** Matches on word starts first ("chic" -> "Grilled chicken"), then anywhere in the name. */
export function suggestFoods(index: FoodSuggestion[], kind: EntryKind, query: string, limit = 6): FoodSuggestion[] {
  const q = norm(query);
  const pool = index.filter(s => s.kind === kind);
  const score = (s: FoodSuggestion) => {
    const n = norm(s.name);
    if (!q) return 0;
    if (n.startsWith(q)) return 3;
    if (n.split(' ').some(w => w.startsWith(q))) return 2;
    if (n.includes(q)) return 1;
    return -1;
  };
  return pool
    .map(s => ({ s, sc: score(s) }))
    .filter(x => x.sc >= 0)
    .sort((a, b) => b.sc - a.sc || Number(b.s.favorite) - Number(a.s.favorite) || b.s.lastUsed - a.s.lastUsed || b.s.count - a.s.count)
    .slice(0, limit)
    .map(x => x.s);
}
