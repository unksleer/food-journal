import { useState, useEffect } from 'react';
import {
  Droplets,
  Activity,
  Plus,
  Trash2,
  ClipboardList,
  Calendar,
  Flame,
  Scale,
  Zap,
  Printer,
  ChevronLeft,
  ChevronRight,
  Settings,
  BookText,
  Target
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Capacitor } from '@capacitor/core';
import { Printer as CapPrinter } from '@capgo/capacitor-printer';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

function getLocalDateString(date: Date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getInitialLog(date: string): DailyLog {
  return {
    date,
    proteinGoal: '',
    totalProteinCalories: 0,
    ketosis: false,
    followedPlan: false,
    notes: '',
    waterIntake: 0,
    fatIntake: 0,
    miscIntake: 0,
    vegIntake: 0,
    fruitIntake: 0,
    foodEntries: [],
    carbEntries: [],
    miscEntries: [],
    miscStringEntries: ['', '', '', ''],
    fatEntries: ['', ''],
    vegetableEntries: ['', ''],
    fruitEntries: ['', ''],
    activities: [],
    supplements: [],
  };
}

function formatDisplayDate(dateStr: string) {
  if (!dateStr) return 'Invalid Date';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const [year, month, day] = parts.map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'short',
    day: 'numeric'
  });
}

function formatDisplayTime(timeStr: string) {
  if (!timeStr) return '';
  if (['B', 'L', 'D', 'S', 'SV', 'NSV', 'G', 'F'].includes(timeStr.toUpperCase())) return timeStr.toUpperCase();
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  const [hours, minutes] = parts.map(Number);
  const date = new Date();
  date.setHours(hours, minutes);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

interface FoodEntry {
  id: string;
  source: string;
  time: string;
  serving: string;
  calories: number;
  hungerBefore: number;
  hungerAfter: number;
}

interface CarbEntry {
  id: string;
  source: string;
  time: string;
  serving: string;
  netCarbs: number;
}

interface MiscEntry {
  id: string;
  source: string;
  time: string;
  serving: string;
  calories: number;
  hungerBefore: number;
  hungerAfter: number;
}

interface ActivityEntry {
  id: string;
  type: string;
  duration: string;
  calories?: string;
}

interface DailyLog {
  date: string;
  proteinGoal: string;
  totalProteinCalories: number;
  ketosis: boolean;
  followedPlan: boolean;
  notes: string;
  waterIntake: number;
  fatIntake?: number;
  miscIntake?: number;
  vegIntake?: number;
  fruitIntake?: number;
  foodEntries: FoodEntry[];
  carbEntries: CarbEntry[];
  miscEntries: MiscEntry[];
  miscStringEntries: string[];
  fatEntries: string[];
  vegetableEntries: string[];
  fruitEntries: string[];
  activities: ActivityEntry[];
  supplements?: any[];
}

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [view, setView] = useState<'today' | 'history' | 'settings'>('today');
  const [clickCount, setClickCount] = useState(0);

  const prevDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() - 1);
    setSelectedDate(getLocalDateString(d));
    setView('today');
  };
  
  const nextDay = () => {
    const d = new Date(selectedDate + 'T12:00:00');
    d.setDate(d.getDate() + 1);
    setSelectedDate(getLocalDateString(d));
    setView('today');
  };
  const [showRescue, setShowRescue] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());

  const [history, setHistory] = useState<DailyLog[]>([]);
  const [log, setLog] = useState<DailyLog>(getInitialLog(getLocalDateString()));

  const [pendingEntry, setPendingEntry] = useState<FoodEntry>({
    id: 'pending',
    source: '',
    time: 'B',
    serving: '',
    calories: 0,
    hungerBefore: 5,
    hungerAfter: 5,
  });

  const [pendingCarbEntry, setPendingCarbEntry] = useState<CarbEntry>({
    id: 'pending-carb',
    source: '',
    time: 'SV',
    serving: '',
    netCarbs: 0,
  });

  const [pendingActivity, setPendingActivity] = useState<ActivityEntry>({
    id: 'pending-activity',
    type: '',
    duration: '',
    calories: '',
  });

  // Initial Load
  useEffect(() => {
    console.log("App: Initializing v3.1...");
    try {
      const savedHistory = localStorage.getItem('food-journal-history');
      let parsedHistory: DailyLog[] = [];
      if (savedHistory) {
        parsedHistory = JSON.parse(savedHistory);
        if (parsedHistory.length > 5) {
          parsedHistory = parsedHistory.slice(0, 5);
        }
        setHistory(parsedHistory);
      }

      const today = getLocalDateString();
      const savedLog = localStorage.getItem('food-journal-log');
      let initialLog = getInitialLog(today);

      if (savedLog) {
        const parsed = JSON.parse(savedLog);
        if (parsed.date === today) {
          initialLog = { ...initialLog, ...parsed };
        }
      }

      // If we have history for today, it wins over the draft 'food-journal-log'
      const historyEntry = parsedHistory.find(h => h.date === today);
      if (historyEntry) {
        setLog(historyEntry);
      } else {
        setLog(initialLog);
      }
      setIsLoaded(true);
    } catch (err) {
      console.error("Storage Recovery failed", err);
      // If critical error, we still set loaded but maybe we should flag it
      setIsLoaded(true);
    }
  }, []);

  // Save current log to history
  useEffect(() => {
    if (!isLoaded) return;

    setHistory(prev => {
      const otherDays = prev.filter(h => h.date !== log.date);
      const newHistory = [log, ...otherDays].sort((a, b) => b.date.localeCompare(a.date));
      return newHistory.slice(0, 5);
    });

    if (log.date === getLocalDateString()) {
      localStorage.setItem('food-journal-log', JSON.stringify(log));
    }
  }, [log, isLoaded]);

  // Persist history with SAFETY GUARD
  useEffect(() => {
    if (!isLoaded) return;

    // CRITICAL SAFETY CHECK: Never overwrite if state is empty but storage has data
    if (history.length === 0) {
      const rawInStore = localStorage.getItem('food-journal-history');
      if (rawInStore && rawInStore !== '[]') {
        console.warn("Journal: Blocked attempt to overwrite storage with empty state. History is SAFE.");
        return;
      }
    }

    localStorage.setItem('food-journal-history', JSON.stringify(history));
  }, [history, isLoaded]);

  // Handle Date Selection Change
  useEffect(() => {
    if (!isLoaded) return;
    const entryForDate = history.find(h => h.date === selectedDate);
    if (entryForDate) {
      setLog(entryForDate);
    } else {
      setLog(getInitialLog(selectedDate));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, isLoaded]);

  // Day-Rollover Logic (Less aggressive now)
  useEffect(() => {
    if (!isLoaded) return;

    const checkDate = () => {
      const today = getLocalDateString();
      // If user is looking at "today" but the clock rolled over, offer to move to new day
      if (selectedDate < today && view === 'today') {
        // We don't force reload, but we could update selectedDate if it was "today"
      }
    };

    const interval = setInterval(checkDate, 60000);
    window.addEventListener('focus', checkDate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', checkDate);
    };
  }, [selectedDate, isLoaded, view]);

  const savePendingEntry = () => {
    if (!pendingEntry.source) return;
    const newEntry = {
      ...pendingEntry,
      id: Math.random().toString(36).substr(2, 9),
      time: pendingEntry.time || 'B'
    };
    setLog(prev => ({ ...prev, foodEntries: [newEntry, ...prev.foodEntries] }));
    setPendingEntry({
      id: 'pending',
      source: '',
      time: 'B',
      serving: '',
      calories: 0,
      hungerBefore: 5,
      hungerAfter: 5,
    });
  };

  const removeFoodEntry = (id: string) => {
    setLog(prev => ({
      ...prev,
      foodEntries: prev.foodEntries.filter(e => e.id !== id)
    }));
  };

  const savePendingCarbEntry = () => {
    if (!pendingCarbEntry.source) return;
    const newEntry = {
      ...pendingCarbEntry,
      id: Math.random().toString(36).substr(2, 9),
      time: pendingCarbEntry.time || 'SV'
    };
    setLog(prev => ({ ...prev, carbEntries: [newEntry, ...(prev.carbEntries || [])] }));
    setPendingCarbEntry({
      id: 'pending-carb',
      source: '',
      time: 'SV',
      serving: '',
      netCarbs: 0,
    });
  };

  const removeCarbEntry = (id: string) => {
    setLog(prev => ({
      ...prev,
      carbEntries: (prev.carbEntries || []).filter(e => e.id !== id)
    }));
  };

  const savePendingActivity = () => {
    if (!pendingActivity.type) return;
    const newEntry = {
      ...pendingActivity,
      id: Math.random().toString(36).substr(2, 9)
    };
    setLog(prev => ({ ...prev, activities: [newEntry, ...prev.activities] }));
    setPendingActivity({ id: 'pending-activity', type: '', duration: '', calories: '' });
  };

  const removeActivity = (id: string) => {
    setLog(prev => ({
      ...prev,
      activities: prev.activities.filter(a => a.id !== id)
    }));
  };
  const proteinCals = log.foodEntries.reduce((sum, e) => sum + (e.calories || 0), 0);
  const carbCals = (log.carbEntries || []).reduce((sum, e) => sum + (e.netCarbs || 0), 0) * 4;
  const fatCals = (log.fatIntake || 0) * 45;
  const totalCalories = proteinCals + carbCals + fatCals;

  const proteinPct = totalCalories > 0 ? (proteinCals / totalCalories) * 100 : 0;
  const carbPct = totalCalories > 0 ? (carbCals / totalCalories) * 100 : 0;

  return (
    <div className="min-h-screen pb-12 max-w-6xl mx-auto px-4 sm:px-8 pt-8">
      {/* ── SINGLE CONSOLIDATED HEADER CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="no-print card mb-8"
        style={{ position: 'relative', overflow: 'hidden', padding: '0.75rem 1.25rem' }}
      >


        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 flex-wrap">

          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }} onClick={() => {
            setClickCount(c => c + 1);
            if (clickCount >= 2) setShowRescue(true);
          }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--secondary)', lineHeight: 1 }}>
              {view === 'today' ? 'FUEL TRACKER: PROTEIN & CARBS' : view === 'settings' ? 'SETTINGS' : 'HISTORY'}
            </h1>
            <span style={{ background: '#dc2626', color: 'white', fontSize: '0.5rem', fontWeight: 700, padding: '1px 6px', borderRadius: '99px', alignSelf: 'flex-start' }}>
              v3.1
            </span>
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-[1px] bg-[var(--border)] self-stretch shrink-0" />

          {/* Date label + picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: '160px' }}>
            <label style={{ fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar style={{ width: '0.7rem', height: '0.7rem', color: 'var(--primary)' }} /> Select Date
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <button onClick={prevDay} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: '0.75rem', padding: '0.35rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft style={{ width: '1rem', height: '1rem', color: 'var(--secondary)' }} />
              </button>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setView('today');
                }}
                style={{ flex: 1, background: 'var(--muted)', border: '1.5px solid var(--border)', borderRadius: '0.75rem', padding: '0.35rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary)', outline: 'none', textAlign: 'center' }}
              />
              <button disabled={selectedDate >= getLocalDateString()} onClick={nextDay} style={{ background: 'var(--card)', border: '1.5px solid var(--border)', borderRadius: '0.75rem', padding: '0.35rem', cursor: selectedDate >= getLocalDateString() ? 'default' : 'pointer', opacity: selectedDate >= getLocalDateString() ? 0.3 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight style={{ width: '1rem', height: '1rem', color: 'var(--secondary)' }} />
              </button>
            </div>
            {selectedDate !== getLocalDateString() && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.55rem', fontWeight: 700, fontStyle: 'italic', marginTop: '2px' }}>
                <Zap style={{ width: '0.6rem', height: '0.6rem' }} />
                Editing: {formatDisplayDate(selectedDate)}
              </div>
            )}
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={async () => {
              if (Capacitor.isNativePlatform()) {
                try {
                  await CapPrinter.printWebView();
                } catch (e) {
                  console.error('Print failed', e);
                }
              } else {
                window.print();
              }
            }}
            style={{ width: '2.2rem', height: '2.2rem', borderRadius: '0.6rem', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)', background: 'var(--card)', cursor: 'pointer', flexShrink: 0 }}
            title="Print Journal"
          >
            <Printer style={{ width: '1rem', height: '1rem', color: 'var(--primary)' }} />
          </motion.button>

        </div>
      </motion.div>

      {view === 'history' ? (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {history.length === 0 ? (
            <div className="card text-center py-20">
              <ClipboardList className="w-12 h-12 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-secondary">No History Yet</h3>
              <p className="text-muted-foreground">Your daily logs will appear here as you complete them.</p>
            </div>
          ) : (
            <div className="history-compact">
              {/* Column Headers */}
              <div className="history-col-header">
                <div className="hcol-date">Date</div>
                <div className="hcol-status">Status</div>
                <div className="hcol-meals">Meal Intake & Carbs (Time · Food · Serving · Cal/Carbs)</div>
                <div className="hcol-meals">Extras (Fat · Misc · Veg · Fruit)</div>
                <div className="hcol-notes">Notes / Activity</div>
              </div>
              {history.slice(0, 5).map((h, i) => (
                <div key={i} className="history-day-row">
                  {/* DATE */}
                  <div className="hcol-date">
                    <button
                      onClick={() => { setSelectedDate(h.date); setView('today'); }}
                      className="history-date-btn"
                    >
                      {formatDisplayDate(h.date)}
                    </button>
                  </div>
                  {/* STATUS */}
                  <div className="hcol-status">
                    <div className="hist-cal">
                      {h.foodEntries.reduce((sum, e) => sum + (e.calories || 0), 0)} kcal
                      {(h.carbEntries || []).length > 0 && <span style={{ color: '#22c55e', fontSize: '0.85em', marginLeft: '4px' }}>/ {(h.carbEntries || []).reduce((sum, e) => sum + (e.netCarbs || 0), 0)}g net</span>}
                    </div>
                    <div className="hist-water">
                      {[...Array(8)].map((_, idx) => (
                        <div key={idx} className={idx < h.waterIntake ? "water-pip filled" : "water-pip"} />
                      ))}
                    </div>
                  </div>
                  {/* MEALS */}
                  <div className="hcol-meals">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                      {h.foodEntries.length === 0 ? (
                        <span className="hist-empty">—</span>
                      ) : (
                        <table className="hist-meal-table">
                          <tbody>
                            {h.foodEntries.map((e, idx) => (
                              <tr key={`food-${idx}`}>
                                <td className="hmt-time">{formatDisplayTime(e.time)}</td>
                                <td className="hmt-source">{e.source}</td>
                                <td className="hmt-serving">{e.serving}</td>
                                <td className="hmt-cal">{e.calories}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}

                      {/* CARB HISTORY */}
                      {(h.carbEntries || []).length > 0 && (
                        <div style={{ marginTop: '0.2rem', paddingTop: '0.4rem', borderTop: '1px dashed var(--border)' }}>
                          <span style={{ fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', color: '#22c55e', marginBottom: '2px', display: 'block' }}>Carbohydrates ({h.carbEntries.reduce((sum, e) => sum + (e.netCarbs || 0), 0)}g net)</span>
                          <table className="hist-meal-table">
                            <tbody>
                              {h.carbEntries.map((e, idx) => (
                                <tr key={`carb-${idx}`}>
                                  <td className="hmt-time" style={{ color: '#22c55e', opacity: 0.8 }}>{formatDisplayTime(e.time)}</td>
                                  <td className="hmt-source" style={{ color: '#22c55e' }}>{e.source}</td>
                                  <td className="hmt-serving" style={{ color: '#22c55e', opacity: 0.8 }}>{e.serving}</td>
                                  <td className="hmt-cal" style={{ color: '#22c55e', fontWeight: 700 }}>{e.netCarbs}g</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* EXTRAS */}
                  <div className="hcol-meals" style={{ gap: '0.75rem', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                      {/* Fat Checkboxes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px', color: '#f59e0b' }}>
                          <Flame style={{ width: '0.7rem', height: '0.7rem' }} /> FAT ({(h.fatIntake || 0)}/2)
                        </div>
                      </div>

                      {/* Misc Checkboxes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px', color: '#a855f7' }}>
                          <ClipboardList style={{ width: '0.7rem', height: '0.7rem' }} /> MISC ({(h.miscIntake || 0)}/4)
                        </div>
                      </div>

                      {/* Veg Checkboxes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px', color: '#22c55e' }}>
                          <Scale style={{ width: '0.7rem', height: '0.7rem' }} /> VEG ({(h.vegIntake || 0)}/2)
                        </div>
                      </div>

                      {/* Fruit Checkboxes */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                        <div style={{ fontSize: '0.65rem', fontWeight: 900, display: 'flex', alignItems: 'center', gap: '4px', color: '#ef4444' }}>
                          <Flame style={{ width: '0.7rem', height: '0.7rem' }} /> FRUITS ({(h.fruitIntake || 0)}/2)
                        </div>
                      </div>
                    </div>
                    {/* Legacy Misc Entries */}
                    {(h.miscEntries || []).length > 0 && (
                      <table className="hist-meal-table">
                        <tbody>
                          {(h.miscEntries || []).map((e, idx) => (
                            <tr key={idx}>
                              <td className="hmt-time">{formatDisplayTime(e.time)}</td>
                              <td className="hmt-source" style={{ color: 'var(--color-purple-600, #9333ea)' }}>{e.source}</td>
                              <td className="hmt-serving">{e.serving}</td>
                              <td className="hmt-cal">{e.calories}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {/* NOTES + ACTIVITY */}
                  <div className="hcol-notes">
                    {h.activities.length > 0 && (
                      <div className="hist-activities">
                        {h.activities.map((a, idx) => (
                          <span key={idx} className="hist-act-tag">{a.duration} {a.type}{a.calories ? ` (${a.calories})` : ''}</span>
                        ))}
                      </div>
                    )}
                    {h.notes && <p className="hist-note">{h.notes}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : view === 'today' ? (
        <>
          <section className="mb-8 flex flex-col gap-4">
            {/* Nutritional Ketosis Card */}
            <motion.div whileHover={{ y: -4 }} className="card relative overflow-hidden flex flex-col justify-center">
              <p style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-foreground)', marginBottom: '0.3rem' }}>Nutritional Ketosis</p>
              <p style={{ fontSize: '0.6rem', color: 'var(--muted-foreground)', lineHeight: '1.6', marginBottom: '0.5rem' }}>
                A metabolic state in which the body primarily uses fat for energy instead of carbohydrates, producing molecules called ketones. This typically occurs when carbohydrate intake is reduced, though individual responses may vary.
              </p>
              <p style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-foreground)', marginBottom: '0.3rem' }}>Disclaimer</p>
              <p style={{ fontSize: '0.58rem', color: 'var(--muted-foreground)', lineHeight: '1.5', fontStyle: 'italic' }}>
                For informational purposes only, not medical or nutritional advice. Consult a physician or registered dietitian for personalized guidance.
              </p>
            </motion.div>

            {/* Target & Stats Cards */}
            <div className="flex flex-col gap-4">
              {/* Top Card: Pie Chart */}
              <motion.div whileHover={{ y: -4 }} className="card relative overflow-hidden flex flex-col items-center justify-center gap-4 py-4">
                {/* Pie Chart Legend */}
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', justifyContent: 'center', flexWrap: 'wrap', width: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--muted-foreground)' }}>Pro</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#3b82f6' }} />
                    <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--muted-foreground)' }}>Carb</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#f59e0b' }} />
                    <span style={{ fontSize: '0.55rem', fontWeight: 700, color: 'var(--muted-foreground)' }}>Fat</span>
                  </div>
                </div>

                {/* Pie Chart */}
                <div 
                  title={`Protein: ${Math.round(proteinPct)}%, Carbs: ${Math.round(carbPct)}%, Fat: ${Math.round(100 - proteinPct - carbPct)}%`}
                  style={{ 
                    width: '6.5rem', 
                    height: '6.5rem', 
                    borderRadius: '50%',
                    background: totalCalories > 0 ? `conic-gradient(var(--primary) 0% ${proteinPct}%, #3b82f6 ${proteinPct}% ${proteinPct + carbPct}%, #f59e0b ${proteinPct + carbPct}% 100%)` : 'var(--muted)',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    border: '2px solid white'
                  }} 
                />
              </motion.div>

              {/* Bottom Card: Stats */}
              <motion.div whileHover={{ y: -4 }} className="card relative overflow-hidden flex flex-col justify-center gap-3" style={{ padding: '0.75rem 1.25rem' }}>
                <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <Target style={{ width: '0.9rem', height: '0.9rem', color: 'var(--primary)' }} /> Target
                </h2>
                
                {/* Horizontal Divider */}
                <div className="w-full h-[1px] bg-[var(--border)]" />

                <div>
                  <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-foreground)' }}>Protein Goal</p>
                  <input
                    style={{ fontSize: '1.4rem', fontWeight: 700, background: 'transparent', border: 'none', borderBottom: '1px solid var(--muted-foreground)', padding: '0 0 2px 0', outline: 'none', width: '100%', display: 'block', marginTop: '2px' }}
                    className="text-secondary placeholder:text-muted-foreground/30 focus:border-primary transition-colors"
                    placeholder="Set Goal"
                    value={log.proteinGoal}
                    onChange={e => setLog(prev => ({ ...prev, proteinGoal: e.target.value }))}
                  />
                </div>
                
                {/* Horizontal Divider */}
                <div className="w-full h-[1px] bg-[var(--border)]" />

                {/* Total Calories Consumed */}
                <div>
                  <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-foreground)', marginBottom: '2px' }}>Total Protein Calories Consumed</p>
                  <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--secondary)', lineHeight: 1.1, marginTop: '2px', borderBottom: '1px solid var(--muted-foreground)', paddingBottom: '2px', width: '100%' }}>
                    {totalCalories} <span style={{ fontSize: '0.7em', color: 'var(--muted-foreground)' }}>kcal</span>
                  </div>
                </div>
                
                {/* Separator */}
                <div className="w-full h-[1px] bg-[var(--border)]" />

                {/* Total Carbs Consumed */}
                <div>
                  <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-foreground)', marginBottom: '4px' }}>Total Carbs Consumed</p>
                  <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#22c55e', lineHeight: 1.1, marginTop: '2px', borderBottom: '1px solid var(--muted-foreground)', paddingBottom: '2px', width: '100%' }}>
                    {(log.carbEntries || []).reduce((sum, e) => sum + (e.netCarbs || 0), 0)} <span style={{ fontSize: '0.75em', opacity: 0.8 }}>/ 50g max</span>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          <div className="space-y-4">
            <section className="card meal-table-container" style={{ padding: '0.75rem 1.25rem' }}>
              <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0, marginBottom: '4px' }}>
                <ClipboardList style={{ width: '0.9rem', height: '0.9rem', color: 'var(--primary)' }} /> Protein Source Input
              </h2>
              {/* Protein calorie guide */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 1rem', margin: '0 0 0.35rem 1.3rem' }}>
                {([
                  ['VLP', 'Very Lean Proteins (35 cal / oz)'],
                  ['LP', 'Lean Proteins (55 cals / oz)'],
                  ['MP', 'Medium Proteins (75 cals / oz)'],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', gap: '0.25rem', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: 'var(--primary)', whiteSpace: 'nowrap' }}>{label}</span>
                    <span style={{ fontSize: '0.55rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{val}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--muted-foreground)', margin: '0 0 0.5rem 1.3rem' }}>
                B = Breakfast, L = Lunch, D = Dinner, S = Snack
              </p>
              <div className="meal-table">
                <div className="meal-row header">
                  <div className="col-source">Protein Source</div>
                  <div className="col-time">Meal</div>
                  <div className="col-serving">Serving</div>
                  <div className="col-cal">Cal</div>
                  <div className="col-action"></div>
                </div>
                <div className="meal-row pending border-2 border-primary/20 bg-primary/[0.02]">
                  <div className="col-source">
                    <input placeholder="What did you eat?" className="table-input font-semibold" value={pendingEntry.source} onChange={e => setPendingEntry(p => ({ ...p, source: e.target.value }))} onKeyDown={e => e.key === 'Enter' && savePendingEntry()} />
                  </div>
                  <div className="col-time">
                    <select className="table-input cursor-pointer text-primary" style={{ appearance: 'none', padding: '0 4px', textAlign: 'center', fontWeight: 'bold' }} value={pendingEntry.time} onChange={e => setPendingEntry(p => ({ ...p, time: e.target.value }))} onKeyDown={e => e.key === 'Enter' && savePendingEntry()}>
                      <option value="B">B</option>
                      <option value="L">L</option>
                      <option value="D">D</option>
                      <option value="S">S</option>
                    </select>
                  </div>
                  <div className="col-serving">
                    <input placeholder="Siz..." className="table-input" value={pendingEntry.serving} onChange={e => setPendingEntry(p => ({ ...p, serving: e.target.value }))} onKeyDown={e => e.key === 'Enter' && savePendingEntry()} />
                  </div>
                  <div className="col-cal">
                    <input type="number" placeholder="0" className="table-input text-primary font-bold" value={pendingEntry.calories || ''} onChange={e => setPendingEntry(p => ({ ...p, calories: parseInt(e.target.value) || 0 }))} onKeyDown={e => e.key === 'Enter' && savePendingEntry()} />
                  </div>
                  <div className="col-action">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={savePendingEntry} disabled={!pendingEntry.source} className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all", pendingEntry.source ? "bg-primary text-white shadow-lg" : "bg-muted text-muted-foreground/30")}>
                      <Plus className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <AnimatePresence mode="popLayout">
                    {log.foodEntries.map((entry) => (
                      <motion.div key={entry.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="meal-row saved group">
                        <div className="col-source">{entry.source}</div>
                        <div className="col-time text-muted-foreground">{formatDisplayTime(entry.time)}</div>
                        <div className="col-serving text-muted-foreground">{entry.serving}</div>
                        <div className="col-cal font-bold text-secondary">{entry.calories}</div>
                        <div className="col-action opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => removeFoodEntry(entry.id)} className="text-red-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </section>

            {/* ── CARBOHYDRATE SOURCE INPUT TABLE ── */}
            <section className="card meal-table-container block" style={{ padding: '0.75rem 1.25rem', marginTop: '1rem', borderLeft: '3px solid #22c55e' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <Scale style={{ width: '0.9rem', height: '0.9rem', color: '#22c55e' }} /> Carbohydrate Source Input
                </h2>
                <div style={{ fontSize: '0.7rem', fontWeight: 900, color: '#22c55e', background: '#22c55e15', padding: '2px 8px', borderRadius: '4px' }}>
                  Total: {(log.carbEntries || []).reduce((sum, e) => sum + (e.netCarbs || 0), 0)}g Net Carbs
                </div>
              </div>
              {/* Carb calorie guide */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.35rem 1rem', margin: '0 0 0.35rem 0' }}>
                {([
                  ['NSV', 'Non-Starchy Veg (25 cals / 5 carbs per 1c raw or ½c cooked)'],
                  ['SV', 'Starchy Veg (30 cals / 10-15g carbs per ½c cooked)'],
                  ['F', 'Fruits (60 cals / 15g carbs per ½c or 1 small whole)'],
                ] as [string, string][]).map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', gap: '0.25rem', alignItems: 'baseline' }}>
                    <span style={{ fontSize: '0.6rem', fontWeight: 900, color: '#15803d', whiteSpace: 'nowrap' }}>{label}</span>
                    <span style={{ fontSize: '0.55rem', color: 'var(--muted-foreground)', whiteSpace: 'nowrap' }}>{val}</span>
                  </div>
                ))}
              </div>
              <p style={{ fontSize: '0.6rem', fontWeight: 700, color: 'var(--muted-foreground)', margin: '0 0 0.5rem 0' }}>
                <strong>F</strong> = Fruit, <strong>SV</strong> = Starchy Vegetable, <strong>NSV</strong> = Non-Starchy Vegetable, <strong>G</strong> = General Carbohydrates
              </p>
              <div className="meal-table">
                <div className="meal-row header" style={{ color: '#22c55e' }}>
                  <div className="col-source">Carbohydrate Source</div>
                  <div className="col-time">Meal</div>
                  <div className="col-serving">Serving</div>
                  <div className="col-cal">Net Carbs</div>
                  <div className="col-action"></div>
                </div>
                <div className="meal-row pending border-2 border-green-500/20 bg-green-500/[0.02]">
                  <div className="col-source">
                    <input placeholder="What did you eat?" className="table-input font-semibold text-green-900" value={pendingCarbEntry.source} onChange={e => setPendingCarbEntry(p => ({ ...p, source: e.target.value }))} onKeyDown={e => e.key === 'Enter' && savePendingCarbEntry()} />
                  </div>
                  <div className="col-time">
                    <select className="table-input cursor-pointer" style={{ appearance: 'none', padding: '0 4px', textAlign: 'center', fontWeight: 'bold', color: '#15803d' }} value={pendingCarbEntry.time} onChange={e => setPendingCarbEntry(p => ({ ...p, time: e.target.value }))} onKeyDown={e => e.key === 'Enter' && savePendingCarbEntry()}>
                      <option value="F">F</option>
                      <option value="SV">SV</option>
                      <option value="NSV">NSV</option>
                      <option value="G">G</option>
                    </select>
                  </div>
                  <div className="col-serving">
                    <input placeholder="Siz..." className="table-input" value={pendingCarbEntry.serving} onChange={e => setPendingCarbEntry(p => ({ ...p, serving: e.target.value }))} onKeyDown={e => e.key === 'Enter' && savePendingCarbEntry()} />
                  </div>
                  <div className="col-cal">
                    <input type="number" placeholder="0" className="table-input font-bold text-green-700" value={pendingCarbEntry.netCarbs || ''} onChange={e => setPendingCarbEntry(p => ({ ...p, netCarbs: parseInt(e.target.value) || 0 }))} onKeyDown={e => e.key === 'Enter' && savePendingCarbEntry()} />
                  </div>
                  <div className="col-action">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={savePendingCarbEntry} disabled={!pendingCarbEntry.source} className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all", pendingCarbEntry.source ? "bg-green-500 text-white shadow-lg" : "bg-muted text-muted-foreground/30")}>
                      <Plus className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <AnimatePresence mode="popLayout">
                    {(log.carbEntries || []).map((entry) => (
                      <motion.div key={entry.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="meal-row saved group bg-green-50/50">
                        <div className="col-source text-green-900">{entry.source}</div>
                        <div className="col-time text-green-700/70">{formatDisplayTime(entry.time)}</div>
                        <div className="col-serving text-green-700/70">{entry.serving}</div>
                        <div className="col-cal font-bold text-green-700">{entry.netCarbs}g</div>
                        <div className="col-action opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => removeCarbEntry(entry.id)} className="text-red-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </section>



            <section className="card" style={{ padding: '0.75rem 1.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between' }}>
                <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                  <Droplets style={{ width: '0.9rem', height: '0.9rem', color: '#3b82f6' }} /> Hydration
                </h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {[...Array(8)].map((_, i) => (
                    <button
                      key={i}
                      className={`water-pill ${i < log.waterIntake ? 'active' : ''}`}
                      onClick={() => setLog(prev => ({ ...prev, waterIntake: i + 1 === log.waterIntake ? i : i + 1 }))}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#3b82f6', marginLeft: '0.5rem', whiteSpace: 'nowrap', width: '100%' }}>
                    {log.waterIntake} / 8
                  </span>
                </div>
              </div>
            </section>

            <section className="card meal-table-container" style={{ padding: '0.75rem 1.25rem' }}>
              <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0, marginBottom: '0.5rem' }}>
                <Activity style={{ width: '0.9rem', height: '0.9rem', color: 'var(--primary)' }} /> Activity Log
              </h2>
              <div className="meal-table">
                <div className="meal-row header">
                  <div className="col-activity">Activity / Workout</div>
                  <div className="col-duration">Duration</div>
                  <div className="col-duration">Calorie Burn</div>
                  <div className="col-action"></div>
                </div>
                <div className="meal-row pending border-2 border-primary/20 bg-primary/[0.02]">
                  <div className="col-activity">
                    <input placeholder="What did you do?" className="table-input font-semibold" value={pendingActivity.type} onChange={e => setPendingActivity(p => ({ ...p, type: e.target.value }))} onKeyDown={e => e.key === 'Enter' && savePendingActivity()} />
                  </div>
                  <div className="col-duration">
                    <input placeholder="e.g. 30 min" className="table-input" value={pendingActivity.duration} onChange={e => setPendingActivity(p => ({ ...p, duration: e.target.value }))} onKeyDown={e => e.key === 'Enter' && savePendingActivity()} />
                  </div>
                  <div className="col-duration">
                    <input placeholder="e.g. 200 kcal" className="table-input" value={pendingActivity.calories || ''} onChange={e => setPendingActivity(p => ({ ...p, calories: e.target.value }))} onKeyDown={e => e.key === 'Enter' && savePendingActivity()} />
                  </div>
                  <div className="col-action">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={savePendingActivity} disabled={!pendingActivity.type} className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all", pendingActivity.type ? "bg-primary text-white shadow-lg" : "bg-muted text-muted-foreground/30")}>
                      <Plus className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <AnimatePresence mode="popLayout">
                    {log.activities.map((activity) => (
                      <motion.div key={activity.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="meal-row saved group">
                        <div className="col-activity font-semibold text-secondary">{activity.type}</div>
                        <div className="col-duration text-muted-foreground">{activity.duration}</div>
                        <div className="col-duration text-muted-foreground font-bold">{activity.calories}</div>
                        <div className="col-action opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => removeActivity(activity.id)} className="text-red-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </section>

            <section className="card" style={{ padding: '0.75rem 1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <h2 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>Reflection</h2>
                <div style={{ fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', color: 'var(--muted-foreground)', letterSpacing: '0.1em' }}>Self-Check</div>
              </div>
              <textarea placeholder="Notes on energy, sleep, or mood..." className="input bg-card border-border/50 text-secondary shadow-inner" style={{ minHeight: '80px', borderRadius: '0.75rem', padding: '0.5rem 0.75rem', fontSize: '0.8rem' }} value={log.notes} onChange={e => setLog(prev => ({ ...prev, notes: e.target.value }))} />
            </section>
          </div>
        </>
      ) : null}

      {view === 'settings' && (
        <section className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="card text-center py-20 flex flex-col items-center">
            <Settings className="w-12 h-12 text-muted-foreground/20 mb-4" />
            <h3 className="text-lg font-bold text-secondary">Settings</h3>
            <p className="text-muted-foreground mb-6">Manage data and preferences.</p>
            <button onClick={() => setShowRescue(true)} className="px-6 py-3 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-bold shadow-sm hover:bg-red-100 flex items-center gap-2 transition-all">
              <Zap className="w-4 h-4" /> Launch Recovery Center
            </button>
            <p className="text-xs text-muted-foreground opacity-50 mt-8">Version 3.1 - Nutritional Ketosis</p>
          </div>
        </section>
      )}

      {/* Bottom Navigation */}
      <div className="bottom-tab-bar no-print">
        <button className={`bottom-tab ${view === 'today' ? 'active' : ''}`} onClick={() => { setView('today'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <BookText />
          Journal
        </button>
        <button className={`bottom-tab ${view === 'history' ? 'active' : ''}`} onClick={() => { setView('history'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <ClipboardList />
          History
        </button>
        <button className={`bottom-tab ${view === 'settings' ? 'active' : ''}`} onClick={() => { setView('settings'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
          <Settings />
          Settings
        </button>
      </div>

      {showRescue && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-6 backdrop-blur-sm no-print">
          <div className="bg-card w-full max-w-2xl rounded-3xl p-8 border border-border overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-red-600 flex items-center gap-2">
                <Zap className="w-5 h-5" /> Rescue Center
              </h2>
              <button onClick={() => setShowRescue(false)} className="text-muted-foreground hover:text-secondary p-2">
                Close
              </button>
            </div>

            <p className="text-sm text-secondary mb-6 leading-relaxed">
              If your history is missing, look at the "Raw Data" below. If you see your old meals, they are still on your computer!
              You can copy-paste this text to a safe place.
            </p>

            <div className="flex-1 overflow-auto space-y-6 pr-2">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-secondary/40">Raw History Data (Last 7 Days)</label>
                <textarea
                  className="w-full h-32 bg-secondary/5 rounded-xl p-4 text-[10px] font-mono border border-border/50 text-secondary"
                  readOnly
                  value={localStorage.getItem('food-journal-history') || 'No History Found'}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-secondary/40">Raw Today/Yesterday Data</label>
                <textarea
                  className="w-full h-32 bg-secondary/5 rounded-xl p-4 text-[10px] font-mono border border-border/50 text-secondary"
                  readOnly
                  value={localStorage.getItem('food-journal-log') || 'No Daily Log Found'}
                />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-border/50">
              <button
                onClick={() => window.location.reload()}
                className="w-full py-4 bg-secondary text-white rounded-2xl font-bold text-sm shadow-lg hover:bg-secondary/90"
              >
                Refresh App
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
