import { useMemo, useState } from 'react';
import { Share2 } from 'lucide-react';
import { Card, Segmented } from '../components/ui';
import { dayStatus, dayTotals, weekSummary } from '../lib/nutrition';
import { shareWeekCard } from '../lib/shareCard';
import { formatRange, lastNDays, todayStr, weekdayLetter, weekdayShort, parseDateStr } from '../lib/date';
import type { DayLog, Settings } from '../types';

type Range = 'week' | 'month';

export function Trends({ days, settings }: { days: Record<string, DayLog>; settings: Settings }) {
  const [range, setRange] = useState<Range>('week');
  const [shareMsg, setShareMsg] = useState('');
  const n = range === 'week' ? 7 : 30;
  const dates = useMemo(() => lastNDays(todayStr(), n), [n]);
  const summary = useMemo(() => weekSummary(days, settings, lastNDays(todayStr(), 7), todayStr()), [days, settings]);

  const share = async () => {
    setShareMsg('');
    try {
      const r = await shareWeekCard(summary, settings);
      if (r === 'downloaded') setShareMsg('Saved as an image.');
      if (r === 'unavailable') setShareMsg('Sharing is not available here.');
    } catch (err) {
      console.error(err);
      setShareMsg('Could not create the image.');
    }
  };

  const rows = dates.map(date => {
    const d = days[date];
    const t = dayTotals(d);
    return { date, day: d, totals: t, status: dayStatus(d, settings, date === todayStr()) };
  });
  const logged = rows.filter(r => r.status !== 'empty');
  const onPlan = rows.filter(r => r.status === 'on-plan' || (r.status === 'in-progress' && r.totals.netCarbs <= settings.carbLimit)).length;
  const avgCarbs = logged.length ? logged.reduce((s, r) => s + r.totals.netCarbs, 0) / logged.length : 0;
  const weights = rows.map(r => r.day?.checkin.weight).filter((w): w is number => typeof w === 'number');
  const weightDelta = weights.length >= 2 ? weights[weights.length - 1] - weights[0] : undefined;
  const ketoneRows = rows.filter(r => typeof r.day?.checkin.ketones === 'number' && (r.day?.checkin.ketoneMethod ?? settings.ketoneMethod) === 'blood');

  return (
    <div className="screen">
      <header className="screen-head">
        <div className="screen-title-block">
          <span className="eyebrow">{formatRange(dates[0], dates[dates.length - 1])}</span>
          <h1 className="screen-title">{range === 'week' ? 'This week' : 'Last 30 days'}</h1>
        </div>
        <Segmented options={[{ key: 'week', label: 'Week' }, { key: 'month', label: 'Month' }]} value={range} onChange={setRange} size="sm" />
      </header>

      {range === 'week' && (
        <Card className="week-review">
          <div className="row-between">
            <div>
              <span className="row-title">Week in review</span>
              <p className="muted">{summary.daysLogged === 0 ? 'Log a few days and your summary appears here.' : `Best streak ${summary.bestStreak} ${summary.bestStreak === 1 ? 'day' : 'days'}${summary.avgKetones !== undefined ? ` · avg ketones ${summary.avgKetones.toFixed(1)}` : ''}`}</p>
            </div>
            <button className="share-btn" onClick={share} disabled={summary.daysLogged === 0} aria-label="Share week as image"><Share2 size={18} /> Share</button>
          </div>
          {shareMsg && <p className="status-msg">{shareMsg}</p>}
        </Card>
      )}

      <div className="stat-grid">
        <Card className="stat"><span className="stat-value">{onPlan} / {n}</span><span className="stat-label">days on plan</span></Card>
        <Card className="stat"><span className="stat-value">{logged.length ? Math.round(avgCarbs) : '—'}{logged.length ? ' g' : ''}</span><span className="stat-label">avg net carbs</span></Card>
        <Card className="stat"><span className="stat-value">{weightDelta === undefined ? '—' : `${weightDelta > 0 ? '+' : weightDelta < 0 ? '−' : ''}${Math.abs(weightDelta).toFixed(1)}`}</span><span className="stat-label">{settings.weightUnit} {range === 'week' ? 'this week' : 'in 30 days'}</span></Card>
      </div>

      <Card>
        <div className="row-between"><span className="row-title">Net carbs</span><span className="muted">limit {settings.carbLimit} g</span></div>
        <BarChart
          values={rows.map(r => r.totals.netCarbs)}
          labels={rows.map(r => (range === 'week' ? weekdayLetter(r.date) : String(parseDateStr(r.date).getDate())))}
          limit={settings.carbLimit}
          faded={rows.map(r => r.status === 'empty')}
          tone="var(--carb)"
          overTone="var(--fat)"
          unit="g"
        />
      </Card>

      <Card>
        <div className="row-between"><span className="row-title">Ketones</span><span className="muted">mmol/L, blood</span></div>
        {ketoneRows.length === 0 ? (
          <p className="empty-note">Log a blood ketone reading in the morning check-in to see the trend.</p>
        ) : (
          <LineChart
            points={rows.map(r => (typeof r.day?.checkin.ketones === 'number' && (r.day?.checkin.ketoneMethod ?? settings.ketoneMethod) === 'blood' ? r.day.checkin.ketones : null))}
            labels={rows.map(r => (range === 'week' ? weekdayLetter(r.date) : String(parseDateStr(r.date).getDate())))}
            band={[1.5, 3.0]}
            max={5}
          />
        )}
      </Card>

      <Card>
        <div className="row-between"><span className="row-title">Protein vs goal</span><span className="muted">goal {settings.proteinGoal} kcal</span></div>
        <div className="hbars">
          {rows.slice(range === 'week' ? 0 : -7).map(r => {
            const pct = Math.min(100, (r.totals.proteinKcal / settings.proteinGoal) * 100);
            return (
              <div key={r.date} className="hbar-row">
                <span className="hbar-label">{weekdayShort(r.date)}</span>
                <div className="bar bar-protein"><div className={`bar-fill ${r.status === 'in-progress' ? 'bar-partial' : ''}`} style={{ width: `${pct}%` }} /></div>
                <span className="hbar-value">{r.status === 'empty' ? '—' : Math.round(r.totals.proteinKcal)}</span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function BarChart({ values, labels, limit, faded, tone, overTone, unit }: { values: number[]; labels: string[]; limit: number; faded: boolean[]; tone: string; overTone: string; unit: string }) {
  const W = 334, H = 120, top = 14, bottom = 22;
  const n = values.length;
  const max = Math.max(limit * 1.25, ...values, 1);
  const plotH = H - top - bottom;
  const slot = W / n;
  const bw = Math.max(4, Math.min(30, slot * 0.62));
  const y = (v: number) => top + plotH - (v / max) * plotH;
  const showLabel = (i: number) => n <= 7 || i % 5 === 0 || i === n - 1;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label={`Net carbs per day, limit ${limit} ${unit}`}>
      <line x1={0} x2={W} y1={y(limit)} y2={y(limit)} stroke={tone} strokeWidth={1.5} strokeDasharray="4 4" />
      {values.map((v, i) => {
        const x = slot * i + (slot - bw) / 2;
        const h = Math.max(v > 0 ? 3 : 0, (v / max) * plotH);
        const over = v > limit;
        return <rect key={i} x={x} y={top + plotH - h} width={bw} height={h} rx={Math.min(6, bw / 2)} fill={over ? overTone : tone} opacity={faded[i] ? 0.25 : 1} />;
      })}
      {values.map((v, i) => (v > limit ? <text key={`t${i}`} x={slot * i + slot / 2} y={y(v) - 4} textAnchor="middle" className="chart-text chart-text-over">{Math.round(v)}</text> : null))}
      {labels.map((l, i) => (showLabel(i) ? <text key={`l${i}`} x={slot * i + slot / 2} y={H - 6} textAnchor="middle" className="chart-text">{l}</text> : null))}
    </svg>
  );
}

function LineChart({ points, labels, band, max }: { points: (number | null)[]; labels: string[]; band: [number, number]; max: number }) {
  const W = 334, H = 110, top = 8, bottom = 22;
  const n = points.length;
  const plotH = H - top - bottom;
  const slot = W / n;
  const yv = (v: number) => top + plotH - (Math.min(v, max) / max) * plotH;
  const pts = points.map((p, i) => (p === null ? null : { x: slot * i + slot / 2, y: yv(p) }));
  const path = pts.reduce((acc, p) => {
    if (!p) return acc;
    return acc + (acc ? ' L' : 'M') + `${p.x.toFixed(1)} ${p.y.toFixed(1)}`;
  }, '');
  const showLabel = (i: number) => n <= 7 || i % 5 === 0 || i === n - 1;
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="img" aria-label="Ketone readings">
      <rect x={0} y={yv(band[1])} width={W} height={yv(band[0]) - yv(band[1])} rx={4} className="chart-band" />
      <text x={W - 4} y={yv(band[1]) + 12} textAnchor="end" className="chart-text">optimal {band[0]}–{band[1]}</text>
      {path && <path d={path} fill="none" stroke="var(--success)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />}
      {pts.map((p, i) => (p ? <circle key={i} cx={p.x} cy={p.y} r={4} fill="var(--card)" stroke="var(--success)" strokeWidth={2.5} /> : null))}
      {labels.map((l, i) => (showLabel(i) ? <text key={`l${i}`} x={slot * i + slot / 2} y={H - 6} textAnchor="middle" className="chart-text">{l}</text> : null))}
    </svg>
  );
}
