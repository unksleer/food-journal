export function toDateStr(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d, 12, 0, 0);
}

export function addDays(s: string, n: number): string {
  const d = parseDateStr(s);
  d.setDate(d.getDate() + n);
  return toDateStr(d);
}

export function todayStr(): string {
  return toDateStr(new Date());
}

export function isToday(s: string): boolean {
  return s === todayStr();
}

export function formatLong(s: string): string {
  return parseDateStr(s).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
}

export function formatShort(s: string): string {
  return parseDateStr(s).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

export function formatMonthYear(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
}

export function formatMonth(year: number, month: number): string {
  return new Date(year, month, 1).toLocaleDateString('en-US', { month: 'long' });
}

export function formatRange(a: string, b: string): string {
  const fa = parseDateStr(a).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const fb = parseDateStr(b).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return `${fa} – ${fb}`;
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

/** Last n dates ending at `end`, oldest first. */
export function lastNDays(end: string, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i));
  return out;
}

export function weekdayLetter(s: string): string {
  return ['S', 'M', 'T', 'W', 'T', 'F', 'S'][parseDateStr(s).getDay()];
}

export function weekdayShort(s: string): string {
  return parseDateStr(s).toLocaleDateString('en-US', { weekday: 'short' });
}
