import { useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, Plus, Trash2, Activity as ActivityIcon } from 'lucide-react';
import { Card, ProgressRow, SectionLabel, SwipeRow } from '../components/ui';
import { dayTotals, inKetosis, ketoneUnit, ketoneZone, mealForHour, mealTotals, tierInfo } from '../lib/nutrition';
import { addDays, formatLong, isToday, todayStr } from '../lib/date';
import { MEALS, uid } from '../types';
import type { Activity, DayLog, Entry, Favorite, Meal, Settings } from '../types';
import type { AddEntryRequest } from './AddEntrySheet';

export function Today({ day, settings, streak, onChangeDay, onSelectDate, onAdd, onQuickAdd, onCheckin }: {
  day: DayLog;
  settings: Settings;
  streak: number;
  onChangeDay: (fn: (d: DayLog) => DayLog) => void;
  onSelectDate: (date: string) => void;
  onAdd: (req: AddEntryRequest) => void;
  onQuickAdd: (fav: Favorite, meal: Meal) => void;
  onCheckin: () => void;
}) {
  const t = dayTotals(day);
  const today = isToday(day.date);
  const currentMeal = today ? mealForHour() : 'L';
  const ketones = day.checkin.ketones;
  const method = day.checkin.ketoneMethod ?? settings.ketoneMethod;
  const zone = ketoneZone(ketones, method);
  const [activity, setActivity] = useState<Activity>({ id: '', type: '', duration: '', calories: '' });

  const removeEntry = (id: string) => onChangeDay(d => ({ ...d, entries: d.entries.filter(e => e.id !== id) }));
  const setWater = (n: number) => onChangeDay(d => ({ ...d, water: n }));

  const addActivity = () => {
    if (!activity.type.trim()) return;
    onChangeDay(d => ({ ...d, activities: [...d.activities, { ...activity, id: uid(), type: activity.type.trim() }] }));
    setActivity({ id: '', type: '', duration: '', calories: '' });
  };

  return (
    <div className="screen">
      <header className="screen-head">
        <div className="date-nav">
          <button className="icon-btn" aria-label="Previous day" onClick={() => onSelectDate(addDays(day.date, -1))}><ChevronLeft size={22} /></button>
          <div className="screen-title-block">
            <span className="eyebrow">{today ? formatLong(day.date) : 'Editing'}</span>
            <h1 className="screen-title">{today ? 'Today' : formatLong(day.date)}</h1>
          </div>
          <button className="icon-btn" aria-label="Next day" disabled={day.date >= todayStr()} onClick={() => onSelectDate(addDays(day.date, 1))}><ChevronRight size={22} /></button>
        </div>
        {streak > 0 && (
          <div className="streak-chip" title="Consecutive days on plan"><Flame size={16} /> {streak} {streak === 1 ? 'day' : 'days'}</div>
        )}
      </header>

      <Card className="summary-card">
        <ProgressRow label="Protein" value={t.proteinKcal} max={settings.proteinGoal} unit="kcal" tone="protein" />
        <ProgressRow label="Net carbs" value={t.netCarbs} max={settings.carbLimit} unit="g" tone="carb" />
        <ProgressRow label="Fat" value={t.fatKcal} unit="kcal" tone="fat" suffix={t.fatGrams ? `(${Math.round(t.fatGrams)} g)` : undefined} />
        <div className="summary-foot">
          {ketones !== undefined && zone ? (
            <button className="ketosis-line" onClick={onCheckin}>
              <span className={`dot dot-${zone.key}`} />
              <strong>{inKetosis(day, settings) ? 'In ketosis' : zone.label}</strong>
              <span className="muted">{ketones} {ketoneUnit(method)}{today ? ' this morning' : ''}</span>
            </button>
          ) : (
            <button className="ketosis-line" onClick={onCheckin}>
              <span className="dot dot-empty" />
              <strong>{today ? 'Morning check-in' : 'Check-in'}</strong>
              <span className="muted">ketones, weight, how you feel</span>
            </button>
          )}
        </div>
      </Card>

      {settings.favorites.length > 0 && (
        <section>
          <SectionLabel>Quick add</SectionLabel>
          <div className="quick-add">
            {settings.favorites.map(f => (
              <button key={f.id} className="quick-chip" onClick={() => onQuickAdd(f, currentMeal)}>
                <span>{f.name}</span>
                <span className={`quick-val tone-${f.kind}`}>{f.value}{f.kind === 'protein' ? '' : ' g'}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="meals">
        <SectionLabel>Meals</SectionLabel>
        {MEALS.map(m => {
          const entries = day.entries.filter(e => e.meal === m.key);
          const mt = mealTotals(day.entries, m.key);
          if (entries.length === 0) {
            return (
              <button key={m.key} className="add-meal" onClick={() => onAdd({ meal: m.key })}>
                <Plus size={18} /> Add {m.label.toLowerCase()}
              </button>
            );
          }
          return (
            <Card key={m.key} className="meal-card">
              <div className="meal-head">
                <span className="meal-name">{m.label}</span>
                <span className="meal-totals">{Math.round(mt.kcal)} kcal · {Math.round(mt.carbs)} g</span>
              </div>
              {entries.map(e => (
                <EntryRow key={e.id} entry={e} onDelete={() => removeEntry(e.id)} onEdit={() => onAdd({ meal: m.key, editing: e })} />
              ))}
              <button className="meal-add-row" onClick={() => onAdd({ meal: m.key })}><Plus size={16} /> Add to {m.label.toLowerCase()}</button>
            </Card>
          );
        })}
      </section>

      <Card className="water-card">
        <div className="water-text">
          <span className="row-title">Water</span>
          <span className="muted">{day.water} of {settings.waterGoal} glasses</span>
        </div>
        <div className="water-glasses" role="group" aria-label="Water">
          {Array.from({ length: settings.waterGoal }, (_, i) => (
            <button key={i} aria-label={`${i + 1} glasses`} className={`glass ${i < day.water ? 'on' : ''}`} onClick={() => setWater(i + 1 === day.water ? i : i + 1)} />
          ))}
        </div>
      </Card>

      <Card className="activity-card">
        <div className="row-title-line"><ActivityIcon size={18} /> <span className="row-title">Activity</span></div>
        {day.activities.map(a => (
          <div key={a.id} className="activity-row">
            <span className="activity-type">{a.type}</span>
            <span className="muted">{[a.duration, a.calories].filter(Boolean).join(' · ')}</span>
            <button className="icon-btn-sm" aria-label="Remove activity" onClick={() => onChangeDay(d => ({ ...d, activities: d.activities.filter(x => x.id !== a.id) }))}><Trash2 size={16} /></button>
          </div>
        ))}
        <div className="activity-form">
          <input className="input" placeholder="Walk, weights, yoga" value={activity.type} onChange={e => setActivity(a => ({ ...a, type: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addActivity()} />
          <input className="input input-sm" placeholder="30 min" value={activity.duration} onChange={e => setActivity(a => ({ ...a, duration: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addActivity()} />
          <button className="icon-btn-fill" aria-label="Add activity" disabled={!activity.type.trim()} onClick={addActivity}><Plus size={20} /></button>
        </div>
      </Card>

      <Card>
        <span className="row-title">Notes</span>
        <textarea className="textarea" placeholder="Energy, cravings, anything worth remembering" value={day.notes} onChange={e => onChangeDay(d => ({ ...d, notes: e.target.value }))} />
      </Card>

      <button className="fab no-print" aria-label="Add food" onClick={() => onAdd({ meal: currentMeal })}><Plus size={28} strokeWidth={2.5} /></button>
    </div>
  );
}

function EntryRow({ entry, onDelete, onEdit }: { entry: Entry; onDelete: () => void; onEdit: () => void }) {
  const info = tierInfo(entry.tier);
  const amount = Number.isInteger(entry.amount) ? entry.amount : entry.amount.toFixed(1);
  return (
    <SwipeRow onDelete={onDelete} onTap={onEdit}>
      <div className="entry-row">
        <span className={`tier-tag tone-${entry.kind}`}>{info?.short ?? (entry.kind === 'protein' ? 'P' : entry.kind === 'carb' ? 'C' : 'F')}</span>
        <div className="entry-text">
          <span className="entry-name">{entry.name}</span>
          <span className="muted">{amount} {entry.unit}{entry.unit === 'serving' && entry.amount !== 1 ? 's' : ''}</span>
        </div>
        <span className={`entry-value tone-${entry.kind}`}>{entry.value}{entry.kind === 'protein' ? '' : ' g'}</span>
      </div>
    </SwipeRow>
  );
}

