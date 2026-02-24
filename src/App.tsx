import { useState, useEffect } from 'react';
import {
  Droplets,
  Activity,
  CheckCircle2,
  Plus,
  Trash2,
  ClipboardList,
  Calendar,
  Flame,
  Scale,
  Zap,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

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
    foodEntries: [],
    miscEntries: [],
    fatEntries: ['', ''],
    vegetableEntries: ['', ''],
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
}

interface DailyLog {
  date: string;
  proteinGoal: string;
  totalProteinCalories: number;
  ketosis: boolean;
  followedPlan: boolean;
  notes: string;
  waterIntake: number;
  foodEntries: FoodEntry[];
  miscEntries: MiscEntry[];
  fatEntries: string[];
  vegetableEntries: string[];
  activities: ActivityEntry[];
  supplements?: any[];
}

export default function App() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [view, setView] = useState<'today' | 'history'>('today');
  const [showRescue, setShowRescue] = useState(false);
  const [selectedDate, setSelectedDate] = useState(getLocalDateString());

  const [history, setHistory] = useState<DailyLog[]>([]);
  const [log, setLog] = useState<DailyLog>(getInitialLog(getLocalDateString()));

  const [pendingEntry, setPendingEntry] = useState<FoodEntry>({
    id: 'pending',
    source: '',
    time: '',
    serving: '',
    calories: 0,
    hungerBefore: 5,
    hungerAfter: 5,
  });

  const [pendingActivity, setPendingActivity] = useState<ActivityEntry>({
    id: 'pending-activity',
    type: '',
    duration: '',
  });

  const [pendingMisc, setPendingMisc] = useState<MiscEntry>({
    id: 'pending-misc',
    source: '',
    time: '',
    serving: '',
    calories: 0,
    hungerBefore: 5,
    hungerAfter: 5,
  });

  // Initial Load
  useEffect(() => {
    console.log("App: Initializing v3.0...");
    // Force alert to confirm update
    setTimeout(() => {
      if (window.confirm("Food Journal Updated to v3.0. Click OK to refresh cache if you don't see the new date picker.")) {
        // Some basic cache busting
      }
    }, 1000);

    try {
      const savedHistory = localStorage.getItem('food-journal-history');
      let parsedHistory: DailyLog[] = [];
      if (savedHistory) {
        parsedHistory = JSON.parse(savedHistory);
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
      return newHistory;
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
      time: pendingEntry.time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    };
    setLog(prev => ({ ...prev, foodEntries: [newEntry, ...prev.foodEntries] }));
    setPendingEntry({
      id: 'pending',
      source: '',
      time: '',
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

  const savePendingActivity = () => {
    if (!pendingActivity.type) return;
    const newEntry = {
      ...pendingActivity,
      id: Math.random().toString(36).substr(2, 9)
    };
    setLog(prev => ({ ...prev, activities: [newEntry, ...prev.activities] }));
    setPendingActivity({ id: 'pending-activity', type: '', duration: '' });
  };

  const removeActivity = (id: string) => {
    setLog(prev => ({
      ...prev,
      activities: prev.activities.filter(a => a.id !== id)
    }));
  };

  const savePendingMisc = () => {
    if (!pendingMisc.source) return;
    const newEntry = {
      ...pendingMisc,
      id: Math.random().toString(36).substr(2, 9),
      time: pendingMisc.time || new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    };
    setLog(prev => ({ ...prev, miscEntries: [newEntry, ...(prev.miscEntries || [])] }));
    setPendingMisc({ id: 'pending-misc', source: '', time: '', serving: '', calories: 0, hungerBefore: 5, hungerAfter: 5 });
  };

  const removeMiscEntry = (id: string) => {
    setLog(prev => ({
      ...prev,
      miscEntries: (prev.miscEntries || []).filter(e => e.id !== id)
    }));
  };

  const totalCalories = log.foodEntries.reduce((sum, e) => sum + (e.calories || 0), 0);

  return (
    <div className="min-h-screen pb-12 max-w-6xl mx-auto px-4 sm:px-8 pt-8">
      {/* ── SINGLE CONSOLIDATED HEADER CARD ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="no-print card mb-8"
        style={{ position: 'relative', overflow: 'hidden', padding: '0.75rem 1.25rem' }}
      >
        {/* "Action Required" badge top-right */}
        <div style={{ position: 'absolute', top: 0, right: 0, background: 'var(--primary)', color: 'white', fontSize: '0.55rem', fontWeight: 900, padding: '3px 12px', borderBottomLeftRadius: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Action Required
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>

          {/* Title */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', flexShrink: 0 }}>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--secondary)', lineHeight: 1 }}>
              {view === 'today' ? 'JOURNAL' : 'HISTORY'}
            </h1>
            <span style={{ background: '#dc2626', color: 'white', fontSize: '0.5rem', fontWeight: 700, padding: '1px 6px', borderRadius: '99px', alignSelf: 'flex-start' }}>
              v3.0
            </span>
          </div>

          {/* Divider */}
          <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch', flexShrink: 0 }} />

          {/* Date label + picker */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1, minWidth: '160px' }}>
            <label style={{ fontSize: '0.55rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.12em', color: 'var(--muted-foreground)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Calendar style={{ width: '0.7rem', height: '0.7rem', color: 'var(--primary)' }} /> Select Date to View / Edit
            </label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => {
                setSelectedDate(e.target.value);
                setView('today');
              }}
              style={{ background: 'var(--muted)', border: '1.5px solid var(--border)', borderRadius: '0.75rem', padding: '0.35rem 0.75rem', fontSize: '0.85rem', fontWeight: 700, color: 'var(--secondary)', cursor: 'pointer', outline: 'none', width: '100%' }}
            />
            {selectedDate !== getLocalDateString() && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#dc2626', fontSize: '0.55rem', fontWeight: 700, fontStyle: 'italic' }}>
                <Zap style={{ width: '0.6rem', height: '0.6rem' }} />
                Editing: {formatDisplayDate(selectedDate)}
              </div>
            )}
          </div>

          {/* Reset to Today */}
          <button
            onClick={() => { setSelectedDate(getLocalDateString()); setView('today'); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
            style={{ padding: '0.45rem 1rem', background: 'var(--secondary)', color: 'white', borderRadius: '0.75rem', fontWeight: 900, fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: 'pointer', flexShrink: 0, whiteSpace: 'nowrap' }}
          >
            Reset to Today
          </button>

          {/* Divider */}
          <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch', flexShrink: 0 }} />

          {/* Journal / History tabs */}
          <div style={{ display: 'flex', background: 'var(--muted)', padding: '3px', borderRadius: '0.75rem', border: '1px solid var(--border)', flexShrink: 0 }}>
            <button
              onClick={() => setView('today')}
              style={{ padding: '0.35rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: 'pointer', background: view === 'today' ? 'white' : 'transparent', color: view === 'today' ? 'var(--secondary)' : 'var(--muted-foreground)', boxShadow: view === 'today' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s' }}
            >Journal</button>
            <button
              onClick={() => setView('history')}
              style={{ padding: '0.35rem 0.85rem', borderRadius: '0.5rem', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: 'pointer', background: view === 'history' ? 'white' : 'transparent', color: view === 'history' ? 'var(--secondary)' : 'var(--muted-foreground)', boxShadow: view === 'history' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none', transition: 'all 0.2s' }}
            >History</button>
          </div>

          {/* Print */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.print()}
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
                <div className="hcol-meals">Meal Intake (Time · Food · Serving · Cal · H↑H↓)</div>
                <div className="hcol-meals">Miscellaneous (Time · Item · Serving · Cal · H↑H↓)</div>
                <div className="hcol-notes">Notes / Activity</div>
              </div>
              {history.map((h, i) => (
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
                    <span className={cn("hist-badge", h.ketosis ? "keto" : "no-keto")}>
                      {h.ketosis ? 'Keto' : 'No Keto'}
                    </span>
                    <span className={cn("hist-badge", h.followedPlan ? "on-track" : "off-track")}>
                      {h.followedPlan ? 'On Track' : 'Off'}
                    </span>
                    <div className="hist-cal">{h.foodEntries.reduce((sum, e) => sum + (e.calories || 0), 0)} kcal</div>
                    <div className="hist-water">
                      {[...Array(8)].map((_, idx) => (
                        <div key={idx} className={idx < h.waterIntake ? "water-pip filled" : "water-pip"} />
                      ))}
                    </div>
                  </div>
                  {/* MEALS */}
                  <div className="hcol-meals">
                    {h.foodEntries.length === 0 ? (
                      <span className="hist-empty">—</span>
                    ) : (
                      <table className="hist-meal-table">
                        <tbody>
                          {h.foodEntries.map((e, idx) => (
                            <tr key={idx}>
                              <td className="hmt-time">{formatDisplayTime(e.time)}</td>
                              <td className="hmt-source">{e.source}</td>
                              <td className="hmt-serving">{e.serving}</td>
                              <td className="hmt-cal">{e.calories}</td>
                              <td className="hmt-hunger">{e.hungerBefore}→{e.hungerAfter}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                  {/* MISCELLANEOUS */}
                  <div className="hcol-meals">
                    {(h.miscEntries || []).length === 0 ? (
                      <span className="hist-empty">—</span>
                    ) : (
                      <table className="hist-meal-table">
                        <tbody>
                          {(h.miscEntries || []).map((e, idx) => (
                            <tr key={idx}>
                              <td className="hmt-time">{formatDisplayTime(e.time)}</td>
                              <td className="hmt-source" style={{ color: 'var(--color-purple-600, #9333ea)' }}>{e.source}</td>
                              <td className="hmt-serving">{e.serving}</td>
                              <td className="hmt-cal">{e.calories}</td>
                              <td className="hmt-hunger">{e.hungerBefore}→{e.hungerAfter}</td>
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
                          <span key={idx} className="hist-act-tag">{a.duration} {a.type}</span>
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
      ) : (
        <>
          <section className="mb-8">
            {/* Single full-width card: Goal | Cals | Guide */}
            <motion.div whileHover={{ y: -4 }} className="card relative overflow-hidden" style={{ display: 'flex', flexDirection: 'row', alignItems: 'stretch', gap: '1.25rem' }}>
              {/* Left: Protein Goal + Cals Consumed stacked */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flexShrink: 0, minWidth: '9rem' }}>
                {/* Protein Goal */}
                <div>
                  <span className="badge bg-primary/10 text-primary">Target</span>
                  <input
                    style={{ fontSize: '1.4rem', fontWeight: 700, background: 'transparent', border: 'none', padding: 0, outline: 'none', width: '100%', display: 'block', marginTop: '2px' }}
                    className="text-secondary placeholder:text-muted-foreground/30"
                    placeholder="Set Goal"
                    value={log.proteinGoal}
                    onChange={e => setLog(prev => ({ ...prev, proteinGoal: e.target.value }))}
                  />
                  <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-foreground)' }}>Protein Goal</p>
                </div>
                {/* Cals Consumed */}
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.3rem' }}>
                  <span className="badge bg-orange-500/10 text-orange-600" style={{ fontSize: '0.55rem' }}>Total</span>
                  <div style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--secondary)', lineHeight: 1.1 }}>{totalCalories}</div>
                  <p style={{ fontSize: '0.6rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-foreground)' }}>Cals Consumed</p>
                </div>
              </div>
              {/* Vertical Divider */}
              <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch', flexShrink: 0 }} />
              {/* Right: Guide */}
              <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--muted-foreground)', marginBottom: '0.4rem' }}>Protein Calories Guide</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', columnGap: '0.75rem', rowGap: '0.15rem' }}>
                  {([
                    ['VLP', '35cal · 7g Pro · 0-1g Fat'],
                    ['LP', '55cal · 7g Pro · 3g Fat'],
                    ['MP', '75cal · 7g Pro · 5g Fat'],
                    ['NSV', '25cal · 5g carb'],
                    ['Fruits', '60cal · 15g carb'],
                    ['Fats', '45cal · 5g Fat'],
                    ['Misc', '0-20cal'],
                  ] as [string, string][]).map(([label, val]) => (
                    <div key={label} style={{ display: 'flex', gap: '0.25rem', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 900, color: 'var(--secondary)', whiteSpace: 'nowrap' }}>{label}</span>
                      <span style={{ fontSize: '0.6rem', color: 'var(--muted-foreground)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</span>
                    </div>
                  ))}
                </div>
              </div>
              <Scale className="absolute -bottom-4 -right-4 w-20 h-20 text-primary opacity-[0.03] rotate-12" />
              <Flame className="absolute -bottom-4 -left-4 w-16 h-16 text-orange-500 opacity-[0.03] rotate-12" />
            </motion.div>
          </section>

          <section className="space-y-3 mb-10">
            {/* Keto + On Track side-by-side in one card */}
            <div className="card" style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '1.5rem', padding: '1rem 1.5rem' }}>
              {/* Left: Ketosis Check */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Zap className={cn('w-4 h-4', log.ketosis ? 'text-yellow-400 fill-yellow-400' : 'text-muted-foreground/30')} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--secondary)' }}>Ketosis Check</span>
                </div>
                <div style={{ display: 'flex', background: 'var(--muted)', borderRadius: '1rem', padding: '3px', border: '1px solid var(--border)' }}>
                  <button onClick={() => setLog(prev => ({ ...prev, ketosis: true }))} style={{ flex: 1, padding: '0.4rem 0.75rem', borderRadius: '0.75rem', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: 'pointer', background: log.ketosis ? 'var(--secondary)' : 'transparent', color: log.ketosis ? 'white' : 'var(--muted-foreground)', transition: 'all 0.2s' }}>Yes</button>
                  <button onClick={() => setLog(prev => ({ ...prev, ketosis: false }))} style={{ flex: 1, padding: '0.4rem 0.75rem', borderRadius: '0.75rem', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: 'pointer', background: !log.ketosis ? '#ef4444' : 'transparent', color: !log.ketosis ? 'white' : 'var(--muted-foreground)', transition: 'all 0.2s' }}>No</button>
                </div>
              </div>
              {/* Vertical Divider */}
              <div style={{ width: '1px', background: 'var(--border)', alignSelf: 'stretch', flexShrink: 0 }} />
              {/* Right: Stayed On Track */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle2 className={cn('w-4 h-4', log.followedPlan ? 'text-primary' : 'text-muted-foreground/30')} />
                  <span style={{ fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.15em', color: 'var(--secondary)' }}>Stayed On Track</span>
                </div>
                <div style={{ display: 'flex', background: 'var(--muted)', borderRadius: '1rem', padding: '3px', border: '1px solid var(--border)' }}>
                  <button onClick={() => setLog(prev => ({ ...prev, followedPlan: true }))} style={{ flex: 1, padding: '0.4rem 0.75rem', borderRadius: '0.75rem', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: 'pointer', background: log.followedPlan ? 'var(--primary)' : 'transparent', color: log.followedPlan ? 'white' : 'var(--muted-foreground)', transition: 'all 0.2s' }}>Yes</button>
                  <button onClick={() => setLog(prev => ({ ...prev, followedPlan: false }))} style={{ flex: 1, padding: '0.4rem 0.75rem', borderRadius: '0.75rem', fontSize: '0.65rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.1em', border: 'none', cursor: 'pointer', background: !log.followedPlan ? '#ef4444' : 'transparent', color: !log.followedPlan ? 'white' : 'var(--muted-foreground)', transition: 'all 0.2s' }}>No</button>
                </div>
              </div>
            </div>
          </section>

          <div className="space-y-12">
            <section className="meal-table-container">
              <h2 className="text-lg font-bold text-secondary flex items-center gap-2 mb-6">
                <ClipboardList className="w-5 h-5 text-primary" /> Meal Intake
              </h2>
              <div className="meal-table">
                <div className="meal-row header">
                  <div className="col-source">Protein Source</div>
                  <div className="col-time">Time</div>
                  <div className="col-serving">Serving</div>
                  <div className="col-cal">Cal</div>
                  <div className="col-hunger">Hunger (B/A)</div>
                  <div className="col-action"></div>
                </div>
                <div className="meal-row pending border-2 border-primary/20 bg-primary/[0.02]">
                  <div className="col-source">
                    <input placeholder="What did you eat?" className="table-input font-semibold" value={pendingEntry.source} onChange={e => setPendingEntry(p => ({ ...p, source: e.target.value }))} onKeyDown={e => e.key === 'Enter' && savePendingEntry()} />
                  </div>
                  <div className="col-time">
                    <input type="time" className="table-input" value={pendingEntry.time} onChange={e => setPendingEntry(p => ({ ...p, time: e.target.value }))} onKeyDown={e => e.key === 'Enter' && savePendingEntry()} />
                  </div>
                  <div className="col-serving">
                    <input placeholder="Siz..." className="table-input" value={pendingEntry.serving} onChange={e => setPendingEntry(p => ({ ...p, serving: e.target.value }))} onKeyDown={e => e.key === 'Enter' && savePendingEntry()} />
                  </div>
                  <div className="col-cal">
                    <input type="number" placeholder="0" className="table-input text-primary font-bold" value={pendingEntry.calories || ''} onChange={e => setPendingEntry(p => ({ ...p, calories: parseInt(e.target.value) || 0 }))} onKeyDown={e => e.key === 'Enter' && savePendingEntry()} />
                  </div>
                  <div className="col-hunger flex items-center gap-2">
                    <input type="number" min="1" max="10" className="table-input w-8 text-center" value={pendingEntry.hungerBefore} onChange={e => setPendingEntry(p => ({ ...p, hungerBefore: parseInt(e.target.value) }))} onKeyDown={e => e.key === 'Enter' && savePendingEntry()} />
                    <span className="text-muted-foreground/30">/</span>
                    <input type="number" min="1" max="10" className="table-input w-8 text-center" value={pendingEntry.hungerAfter} onChange={e => setPendingEntry(p => ({ ...p, hungerAfter: parseInt(e.target.value) }))} onKeyDown={e => e.key === 'Enter' && savePendingEntry()} />
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
                        <div className="col-hunger text-primary font-medium">{entry.hungerBefore} → {entry.hungerAfter}</div>
                        <div className="col-action opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => removeFoodEntry(entry.id)} className="text-red-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </section>

            {/* ── MISCELLANEOUS ── */}
            <section className="meal-table-container">
              <h2 className="text-lg font-bold text-secondary flex items-center gap-2 mb-6">
                <ClipboardList className="w-5 h-5 text-purple-500" /> Miscellaneous
              </h2>
              <div className="meal-table">
                <div className="meal-row header">
                  <div className="col-source">Source / Item</div>
                  <div className="col-time">Time</div>
                  <div className="col-serving">Serving</div>
                  <div className="col-cal">Cal</div>
                  <div className="col-hunger">Hunger (B/A)</div>
                  <div className="col-action"></div>
                </div>
                <div className="meal-row pending border-2 border-purple-400/20 bg-purple-50/30">
                  <div className="col-source">
                    <input placeholder="What did you have?" className="table-input font-semibold" value={pendingMisc.source} onChange={e => setPendingMisc(p => ({ ...p, source: e.target.value }))} onKeyDown={e => e.key === 'Enter' && savePendingMisc()} />
                  </div>
                  <div className="col-time">
                    <input type="time" className="table-input" value={pendingMisc.time} onChange={e => setPendingMisc(p => ({ ...p, time: e.target.value }))} onKeyDown={e => e.key === 'Enter' && savePendingMisc()} />
                  </div>
                  <div className="col-serving">
                    <input placeholder="Siz..." className="table-input" value={pendingMisc.serving} onChange={e => setPendingMisc(p => ({ ...p, serving: e.target.value }))} onKeyDown={e => e.key === 'Enter' && savePendingMisc()} />
                  </div>
                  <div className="col-cal">
                    <input type="number" placeholder="0" className="table-input text-purple-600 font-bold" value={pendingMisc.calories || ''} onChange={e => setPendingMisc(p => ({ ...p, calories: parseInt(e.target.value) || 0 }))} onKeyDown={e => e.key === 'Enter' && savePendingMisc()} />
                  </div>
                  <div className="col-hunger flex items-center gap-2">
                    <input type="number" min="1" max="10" className="table-input w-8 text-center" value={pendingMisc.hungerBefore} onChange={e => setPendingMisc(p => ({ ...p, hungerBefore: parseInt(e.target.value) }))} onKeyDown={e => e.key === 'Enter' && savePendingMisc()} />
                    <span className="text-muted-foreground/30">/</span>
                    <input type="number" min="1" max="10" className="table-input w-8 text-center" value={pendingMisc.hungerAfter} onChange={e => setPendingMisc(p => ({ ...p, hungerAfter: parseInt(e.target.value) }))} onKeyDown={e => e.key === 'Enter' && savePendingMisc()} />
                  </div>
                  <div className="col-action">
                    <motion.button whileTap={{ scale: 0.9 }} onClick={savePendingMisc} disabled={!pendingMisc.source} className={cn("w-8 h-8 rounded-full flex items-center justify-center transition-all", pendingMisc.source ? "bg-purple-500 text-white shadow-lg" : "bg-muted text-muted-foreground/30")}>
                      <Plus className="w-5 h-5" />
                    </motion.button>
                  </div>
                </div>
                <div className="space-y-2 mt-4">
                  <AnimatePresence mode="popLayout">
                    {(log.miscEntries || []).map((entry) => (
                      <motion.div key={entry.id} layout initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} className="meal-row saved group">
                        <div className="col-source">{entry.source}</div>
                        <div className="col-time text-muted-foreground">{formatDisplayTime(entry.time)}</div>
                        <div className="col-serving text-muted-foreground">{entry.serving}</div>
                        <div className="col-cal font-bold text-secondary">{entry.calories}</div>
                        <div className="col-hunger text-purple-600 font-medium">{entry.hungerBefore} → {entry.hungerAfter}</div>
                        <div className="col-action opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => removeMiscEntry(entry.id)} className="text-red-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </section>

            <section className="card">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-lg font-bold text-secondary flex items-center gap-2">
                  <Droplets className="w-5 h-5 text-blue-500" /> Hydration
                </h2>
                <div className="badge bg-blue-500/10 text-blue-600 lowercase font-black">{log.waterIntake} of 8 glasses</div>
              </div>
              <div className="water-container">
                {[...Array(8)].map((_, i) => (
                  <motion.button key={i} whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => setLog(prev => ({ ...prev, waterIntake: i + 1 === log.waterIntake ? i : i + 1 }))} className={cn("water-drop", i < log.waterIntake && "filled")}>
                    <Droplets className="w-5 h-5" />
                  </motion.button>
                ))}
              </div>
            </section>

            <section className="meal-table-container">
              <h2 className="text-lg font-bold text-secondary flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-primary" /> Activity Log
              </h2>
              <div className="meal-table">
                <div className="meal-row header">
                  <div className="col-activity">Activity / Workout</div>
                  <div className="col-duration">Duration</div>
                  <div className="col-action"></div>
                </div>
                <div className="meal-row pending border-2 border-primary/20 bg-primary/[0.02]">
                  <div className="col-activity">
                    <input placeholder="What did you do?" className="table-input font-semibold" value={pendingActivity.type} onChange={e => setPendingActivity(p => ({ ...p, type: e.target.value }))} onKeyDown={e => e.key === 'Enter' && savePendingActivity()} />
                  </div>
                  <div className="col-duration">
                    <input placeholder="e.g. 30 min" className="table-input" value={pendingActivity.duration} onChange={e => setPendingActivity(p => ({ ...p, duration: e.target.value }))} onKeyDown={e => e.key === 'Enter' && savePendingActivity()} />
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
                        <div className="col-action opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => removeActivity(activity.id)} className="text-red-400 hover:text-red-500 p-1"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            </section>

            <section>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-bold text-secondary">Reflection</h2>
                <div className="text-[10px] font-black uppercase text-muted-foreground">Self-Check</div>
              </div>
              <textarea placeholder="Notes on energy, sleep, or mood..." className="input min-h-[120px] rounded-[2rem] bg-card border-border/50 text-secondary p-6 shadow-inner" value={log.notes} onChange={e => setLog(prev => ({ ...prev, notes: e.target.value }))} />
            </section>
          </div>
        </>
      )}

      {/* Rescue Center Button (Alt-Click the Calendar icon to open) */}
      {/* Rescue Center Button (Now highly visible for recovery) */}
      <div
        className="fixed bottom-6 right-6 opacity-100 z-[100] no-print"
        onClick={() => setShowRescue(true)}
      >
        <div className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-full font-black text-xs flex items-center gap-2 shadow-2xl cursor-pointer transform hover:scale-105 transition-all animate-pulse">
          <Zap className="w-4 h-4 fill-white" /> RECOVERY CENTER
        </div>
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
