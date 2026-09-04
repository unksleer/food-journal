import { useCallback, useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Printer as CapPrinter } from '@capgo/capacitor-printer';
import { TabBar } from './components/TabBar';
import { Today } from './screens/Today';
import { AddEntrySheet } from './screens/AddEntrySheet';
import type { AddEntryRequest } from './screens/AddEntrySheet';
import { Checkin } from './screens/Checkin';
import { Trends } from './screens/Trends';
import { History } from './screens/History';
import { SettingsScreen } from './screens/Settings';
import { Onboarding } from './screens/Onboarding';
import { requestReview, syncReminders } from './lib/native';
import { buildFoodIndex } from './lib/foods';
import { ensureToday, loadAllDays, loadSettings, migrateLegacy, saveDay, saveSettings } from './storage';
import { dayStatus, dayTotals } from './lib/nutrition';
import { addDays, daysInMonth, formatLong, formatMonthYear, toDateStr, todayStr } from './lib/date';
import { emptyDay, MEALS, uid } from './types';
import type { Checkin as CheckinData, DayLog, Entry, Favorite, Meal, Settings, View } from './types';

export default function App() {
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [days, setDays] = useState<Record<string, DayLog>>({});
  const [loaded, setLoaded] = useState(false);
  const [selectedDate, setSelectedDate] = useState(todayStr());
  const [view, setView] = useState<View>(() => (loadSettings().onboardedAt ? 'today' : 'onboarding'));
  const [addReq, setAddReq] = useState<AddEntryRequest | null>(null);
  const [addSeq, setAddSeq] = useState(0);
  const [printMonth, setPrintMonth] = useState<{ year: number; month: number } | null>(null);

  // Load + one-time migration from v3.1 storage
  useEffect(() => {
    const m = migrateLegacy();
    if (m.proteinGoal) {
      setSettings(s => {
        const next = { ...s, proteinGoal: m.proteinGoal! };
        saveSettings(next);
        return next;
      });
    }
    const all = loadAllDays();
    setDays(ensureToday(all));
    // Existing users who already have journals skip the welcome flow.
    if (Object.keys(all).length > 0) {
      setSettings(s => {
        if (s.onboardedAt) return s;
        const next = { ...s, onboardedAt: Date.now() };
        saveSettings(next);
        return next;
      });
      setView('today');
    }
    setLoaded(true);
  }, []);

  // Roll to the new day when the app comes back after midnight
  useEffect(() => {
    const check = () => {
      const t = todayStr();
      setDays(d => (d[t] ? d : { ...d, [t]: emptyDay(t) }));
    };
    window.addEventListener('focus', check);
    const id = setInterval(check, 60_000);
    return () => { window.removeEventListener('focus', check); clearInterval(id); };
  }, []);

  const day = days[selectedDate] ?? emptyDay(selectedDate);

  const updateDay = useCallback((date: string, fn: (d: DayLog) => DayLog) => {
    setDays(prev => {
      const next = fn(prev[date] ?? emptyDay(date));
      saveDay(next);
      return { ...prev, [date]: next };
    });
  }, []);

  const loggedToday = (days[todayStr()]?.entries.length ?? 0) > 0;
  const foodIndex = useMemo(() => buildFoodIndex(days, settings.favorites), [days, settings.favorites]);
  const weekReviewDue = useMemo(() => {
    const now = new Date();
    const dow = now.getDay();
    const enoughDays = Object.values(days).filter(d => d.entries.length > 0).length >= 3;
    return enoughDays && ((dow === 0 && now.getHours() >= 17) || dow === 1);
  }, [days]);
  const loggedDayCount = useMemo(() => Object.values(days).filter(d => d.entries.length > 0).length, [days]);

  const changeSettings = (s: Settings) => {
    setSettings(s);
    saveSettings(s);
    void syncReminders(s.reminders, loggedToday);
  };

  // Keep the evening nudge from firing on a day that already has food logged.
  useEffect(() => {
    if (!loaded || !settings.onboardedAt) return;
    void syncReminders(settings.reminders, loggedToday);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedToday, loaded]);

  // Ask for an App Store rating once, after a week of real use.
  useEffect(() => {
    if (!loaded || settings.reviewRequestedAt || loggedDayCount < 7) return;
    const next = { ...settings, reviewRequestedAt: Date.now() };
    setSettings(next);
    saveSettings(next);
    const t = setTimeout(() => { void requestReview(); }, 1500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loggedDayCount, loaded]);

  const streak = useMemo(() => {
    let n = 0;
    let d = todayStr();
    const todayLog = days[d];
    if (todayLog && todayLog.entries.length > 0 && dayTotals(todayLog).netCarbs <= settings.carbLimit) n++;
    d = addDays(d, -1);
    while (days[d] && dayStatus(days[d], settings, false) === 'on-plan') { n++; d = addDays(d, -1); }
    return n;
  }, [days, settings]);

  const previousWeight = useMemo(() => {
    const dates = Object.keys(days).filter(d => d < selectedDate && typeof days[d].checkin.weight === 'number').sort();
    return dates.length ? days[dates[dates.length - 1]].checkin.weight : undefined;
  }, [days, selectedDate]);

  const saveEntry = (entry: Entry) => updateDay(selectedDate, d => {
    const exists = d.entries.some(e => e.id === entry.id);
    return { ...d, entries: exists ? d.entries.map(e => (e.id === entry.id ? entry : e)) : [...d.entries, entry] };
  });

  const quickAdd = (fav: Favorite, meal: Meal) => saveEntry({ id: uid(), kind: fav.kind, name: fav.name, tier: fav.tier, amount: fav.amount, unit: fav.unit, value: fav.value, meal, createdAt: Date.now() });

  const saveFavorite = (fav: Favorite) => {
    if (settings.favorites.some(f => f.name.toLowerCase() === fav.name.toLowerCase() && f.kind === fav.kind)) return;
    changeSettings({ ...settings, favorites: [...settings.favorites, fav].slice(-12) });
  };

  const saveCheckin = (c: CheckinData) => updateDay(selectedDate, d => ({ ...d, checkin: c }));

  const openDay = (date: string) => { setSelectedDate(date); setView('today'); window.scrollTo({ top: 0 }); };

  const exportMonth = (year: number, month: number) => setPrintMonth({ year, month });
  useEffect(() => {
    if (!printMonth) return;
    const t = setTimeout(async () => {
      try {
        if (Capacitor.isNativePlatform()) await CapPrinter.printWebView();
        else window.print();
      } catch (err) {
        console.error('print failed', err);
      } finally {
        setPrintMonth(null);
      }
    }, 80);
    return () => clearTimeout(t);
  }, [printMonth]);

  if (!loaded) return null;

  if (view === 'onboarding') {
    return <Onboarding settings={settings} onDone={s => { changeSettings(s); setView('today'); }} />;
  }

  return (
    <div className="app">
      <main className="app-main">
        {view === 'today' && (
          <Today
            day={day}
            settings={settings}
            streak={streak}
            weekReviewDue={weekReviewDue}
            onChangeDay={fn => updateDay(selectedDate, fn)}
            onSelectDate={setSelectedDate}
            onAdd={req => { setAddReq(req); setAddSeq(n => n + 1); }}
            onQuickAdd={quickAdd}
            onCheckin={() => setView('checkin')}
            onOpenTrends={() => { setView('trends'); window.scrollTo({ top: 0 }); }}
          />
        )}
        {view === 'checkin' && (
          <Checkin key={selectedDate} day={day} previousWeight={previousWeight} settings={settings} onSave={saveCheckin} onBack={() => setView('today')} />
        )}
        {view === 'trends' && <Trends days={days} settings={settings} />}
        {view === 'history' && <History days={days} settings={settings} onOpenDay={openDay} onExportMonth={exportMonth} />}
        {view === 'settings' && (
          <SettingsScreen settings={settings} onChange={changeSettings} onDataChanged={() => { setSettings(loadSettings()); setDays(ensureToday(loadAllDays())); }} />
        )}
      </main>

      <TabBar view={view} onChange={v => { setView(v); window.scrollTo({ top: 0, behavior: 'smooth' }); }} />

      <AddEntrySheet request={addReq} formKey={addSeq} foodIndex={foodIndex} onClose={() => setAddReq(null)} onSave={saveEntry} onSaveFavorite={saveFavorite} />

      {printMonth && <MonthPrint days={days} settings={settings} year={printMonth.year} month={printMonth.month} />}
    </div>
  );
}

function MonthPrint({ days, settings, year, month }: { days: Record<string, DayLog>; settings: Settings; year: number; month: number }) {
  const count = daysInMonth(year, month);
  const dates = Array.from({ length: count }, (_, i) => toDateStr(new Date(year, month, i + 1))).filter(d => days[d] && days[d].entries.length > 0);
  return (
    <div className="print-only">
      <h1>Fuel Tracker · {formatMonthYear(year, month)}</h1>
      <p className="print-sub">Protein goal {settings.proteinGoal} kcal · net carb limit {settings.carbLimit} g</p>
      {dates.length === 0 && <p>No days logged this month.</p>}
      {dates.map(date => {
        const d = days[date];
        const t = dayTotals(d);
        return (
          <section key={date} className="print-day">
            <h2>
              {formatLong(date)}
              <span className="print-totals">{Math.round(t.proteinKcal)} kcal protein · {Math.round(t.netCarbs)} g net carbs · {Math.round(t.fatGrams)} g fat
                {typeof d.checkin.ketones === 'number' ? ` · ketones ${d.checkin.ketones}` : ''}
                {typeof d.checkin.weight === 'number' ? ` · ${d.checkin.weight} ${settings.weightUnit}` : ''}
              </span>
            </h2>
            <table>
              <tbody>
                {MEALS.map(m => d.entries.filter(e => e.meal === m.key).map((e, i) => (
                  <tr key={e.id}>
                    <td className="print-meal">{i === 0 ? m.label : ''}</td>
                    <td>{e.tier ?? ''}</td>
                    <td>{e.name}</td>
                    <td>{e.amount} {e.unit}</td>
                    <td className="print-num">{e.value} {e.kind === 'protein' ? 'kcal' : 'g'}</td>
                  </tr>
                )))}
              </tbody>
            </table>
            {(d.water > 0 || d.activities.length > 0 || d.notes) && (
              <p className="print-extra">
                {d.water > 0 ? `Water ${d.water}/${settings.waterGoal}. ` : ''}
                {d.activities.map(a => `${a.type} ${a.duration}`.trim()).join(', ')}{d.activities.length ? '. ' : ''}
                {d.notes}
              </p>
            )}
          </section>
        );
      })}
    </div>
  );
}
