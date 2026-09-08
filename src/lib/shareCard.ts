import type { WeekSummary } from './nutrition';
import type { Settings } from '../types';
import { formatRange } from './date';

const FONT = "'Outfit', system-ui, -apple-system, sans-serif";

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** Draws the week-in-review card as a 1080x1080 PNG. Pure canvas, no dependencies. */
export async function renderWeekCard(sum: WeekSummary, settings: Settings): Promise<Blob> {
  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  try { await (document as Document & { fonts?: FontFaceSet }).fonts?.load(`800 64px ${FONT}`); } catch { /* fallback font */ }

  // Ground
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, '#f6ede2');
  g.addColorStop(1, '#fbf7f1');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Header
  ctx.fillStyle = '#8a5a3c';
  ctx.font = `600 30px ${FONT}`;
  ctx.fillText(formatRange(sum.start, sum.end).toUpperCase(), 80, 120);
  ctx.fillStyle = '#2f2622';
  ctx.font = `800 84px ${FONT}`;
  ctx.fillText('My week', 80, 210);

  // Flame mark, top right
  ctx.save();
  ctx.translate(size - 80 - 140, 70);
  ctx.scale(140 / 1024, 140 / 1024);
  const flame = new Path2D('M560 170 C620 290 735 380 735 540 C735 690 630 820 512 820 C394 820 289 690 289 540 C289 430 370 380 420 300 C445 260 470 220 560 170 Z');
  const leaf = new Path2D('M512 430 C650 470 680 640 555 775 C420 720 400 540 512 430 Z');
  ctx.fillStyle = '#c2410c';
  ctx.fill(flame);
  ctx.fillStyle = '#f6ede2';
  ctx.fill(leaf);
  ctx.restore();

  // Stat tiles
  const tiles: { value: string; label: string; accent?: string }[] = [
    { value: `${sum.daysOnPlan} / 7`, label: 'days on plan' },
    { value: sum.daysLogged ? `${Math.round(sum.avgNetCarbs)} g` : '—', label: 'avg net carbs', accent: '#2563eb' },
    { value: sum.weightDelta === undefined ? '—' : `${sum.weightDelta > 0 ? '+' : sum.weightDelta < 0 ? '−' : ''}${Math.abs(sum.weightDelta).toFixed(1)}`, label: `${settings.weightUnit} this week` },
    { value: sum.avgKetones === undefined ? '—' : sum.avgKetones.toFixed(1), label: 'avg ketones', accent: '#10b981' },
    { value: sum.daysLogged ? `${Math.round(sum.avgProteinKcal)}` : '—', label: 'avg protein kcal', accent: '#c2410c' },
    { value: `${sum.bestStreak}`, label: 'best streak, days' },
  ];
  const cols = 2, tw = 440, th = 200, gap = 40, x0 = 80, y0 = 290;
  tiles.forEach((t, i) => {
    const x = x0 + (i % cols) * (tw + gap);
    const y = y0 + Math.floor(i / cols) * (th + gap);
    ctx.fillStyle = '#ffffff';
    roundRect(ctx, x, y, tw, th, 32);
    ctx.fill();
    ctx.fillStyle = t.accent ?? '#2f2622';
    ctx.font = `800 72px ${FONT}`;
    ctx.fillText(t.value, x + 36, y + 110);
    ctx.fillStyle = '#8a5a3c';
    ctx.font = `600 28px ${FONT}`;
    ctx.fillText(t.label, x + 36, y + 160);
  });

  // Footer
  ctx.fillStyle = '#8a5a3c';
  ctx.font = `600 28px ${FONT}`;
  ctx.fillText('Fuel Tracker · Medi-Weightloss journal', 80, size - 70);

  return new Promise((resolve, reject) => canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png'));
}

export type ShareOutcome = 'shared' | 'downloaded' | 'unavailable';

/** Shares the PNG through the system share sheet where available, otherwise offers a download. */
export async function shareWeekCard(sum: WeekSummary, settings: Settings): Promise<ShareOutcome> {
  const blob = await renderWeekCard(sum, settings);
  const file = new File([blob], `fuel-tracker-week-${sum.end}.png`, { type: 'image/png' });
  const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
  if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
    try {
      await nav.share({ files: [file], title: 'My week on Fuel Tracker' });
      return 'shared';
    } catch (err) {
      if ((err as Error).name === 'AbortError') return 'shared';
    }
  }
  try {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    return 'downloaded';
  } catch {
    return 'unavailable';
  }
}
