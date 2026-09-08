import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Card } from '../components/ui';
import { dayStatus, dayTotals } from '../lib/nutrition';
import { daysInMonth, formatLong, formatMonth, parseDateStr, toDateStr, todayStr } from '../lib/date';
import { MEALS } from '../types';
import type { DayLog, Settings } from '../types';

export function History({ days, settings, onOpenDay, onExportMonth }: {
  days: Record<string, DayLog>;
  settings: Settings;
  onOpenDay: (date: string) => void;
  onExportMonth: (year: number, month: number) => void;
}) {
  const now = new Date();
  const [ym, setYm] = useState({ year: now.getFullYear(), month: now.getMonth() });
  const [selected, setSelected] = useState<string>(todayStr());

  const grid = useMemo(() => {
    const first = new Date(ym.year, ym.month, 1);
    const lead = first.getDay();
    const count = daysInMonth(ym.year, ym.month);
    const cells: (string | null)[] = Array.from({ length: lead }, () => null);
    for (let d = 1; d <= count; d++) cells.push(toDateStr(new Date(ym.year, ym.month, d)));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
  }, [ym]);

  const canGoNext = ym.year < now.getFullYear() || (ym.year === now.getFullYear() && ym.month < now.getMonth());
  const move = (n: number) => setYm(({ year, month }) => {
    const d = new Date(year, month + n, 1);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const sel = days[selected];
  const selTotals = dayTotals(sel);
  const selStatus = dayStatus(sel, settings, selected === todayStr());
  const logged = Object.keys(days).filter(d => d.startsWith(`${ym.year}-${String(ym.month + 1).padStart(2, '0')}`) && days[d].entries.length > 0).length;

  return (
    <div className="screen">
      <header className="screen-head">
        <div className="screen-title-block">
          <span className="eyebrow">History · {logged} {logged === 1 ? 'day' : 'days'} logged</span>
          <h1 className="screen-title">{formatMonth(ym.year, ym.month)}{ym.year !== now.getFullYear() ? ` ${ym.year}` : ''}</h1>
        </div>
        <div className="btn-pair">
          <button className="icon-btn" aria-label="Previous month" onClick={() => move(-1)}><ChevronLeft size={22} /></button>
          <button className="icon-btn" aria-label="Next month" disabled={!canGoNext} onClick={() => move(1)}><ChevronRight size={22} /></button>
        </div>
      </header>

      <Card className="calendar-card">
        <div className="cal-grid cal-head">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}
        </div>
        <div className="cal-grid">
          {grid.map((date, i) => {
            if (!date) return <span key={i} />;
            const st = dayStatus(days[date], settings, date === todayStr());
            const future = date > todayStr();
            return (
              <button
                key={date}
                className={`cal-day ${selected === date ? 'selected' : ''} ${date === todayStr() ? 'today' : ''} ${future ? 'future' : ''}`}
                disabled={future}
                onClick={() => setSelected(date)}
                aria-label={formatLong(date)}
              >
                <span className="cal-num">{parseDateStr(date).getDate()}</span>
                <span className={`cal-dot st-${st}`} />
              </button>
            );
          })}
        </div>
        <div className="legend">
          <span><i className="cal-dot st-on-plan" /> On plan</span>
          <span><i className="cal-dot st-over" /> Over carbs</span>
          <span><i className="cal-dot st-in-progress" /> In progress</span>
        </div>
      </Card>

      <Card className="day-summary">
        <div className="row-between">
          <span className="row-title">{formatLong(selected)}</span>
          {selStatus !== 'empty' && (
            <span className={`status-pill st-${selStatus}`}>{selStatus === 'on-plan' ? 'On plan' : selStatus === 'over' ? 'Over carbs' : 'In progress'}</span>
          )}
        </div>
        {selStatus === 'empty' ? (
          <p className="empty-note">Nothing logged this day.</p>
        ) : (
          <>
            <div className="stat-grid inline">
              <div className="stat-inline"><span className="stat-value">{Math.round(selTotals.proteinKcal)}</span><span className="stat-label">protein kcal</span></div>
              <div className="stat-inline"><span className="stat-value tone-carb">{Math.round(selTotals.netCarbs)} g</span><span className="stat-label">net carbs</span></div>
              <div className="stat-inline"><span className="stat-value">{sel?.checkin.ketones ?? '—'}</span><span className="stat-label">ketones</span></div>
            </div>
            <div className="day-meals">
              {MEALS.map(m => {
                const es = (sel?.entries ?? []).filter(e => e.meal === m.key);
                if (!es.length) return null;
                return (
                  <div key={m.key} className="day-meal-line">
                    <span>{m.label} · {es.map(e => e.name).join(', ')}</span>
                  </div>
                );
              })}
            </div>
          </>
        )}
        <button className="btn-secondary" onClick={() => onOpenDay(selected)}>Open day</button>
      </Card>

      <button className="row-button" onClick={() => onExportMonth(ym.year, ym.month)}>
        <Download size={20} /> <span>Export {formatMonth(ym.year, ym.month)} as PDF</span> <ChevronRight size={18} className="muted" />
      </button>
    </div>
  );
}
