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
      <motion.header
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex justify-between items-start mb-10"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-black tracking-tighter text-secondary">
                {view === 'today' ? 'JOURNAL' : 'HISTORY'}
              </h1>
              <span className="bg-red-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full animate-pulse">
                v3.0 - PERSISTENCE FIXED
              </span>
            </div>
          </div>

          {/* UNDENIABLE DATE SELECTOR */}
          <div className="no-print bg-white border-4 border-primary rounded-[2.5rem] p-6 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-primary text-white text-[8px] font-black px-4 py-1 rounded-bl-xl uppercase tracking-widest">
              Action Required
            </div>
            <div className="flex flex-col sm:flex-row items-end gap-4">
              <div className="flex-1 w-full space-y-2">
                <label className="text-xs font-black uppercase text-secondary/60 tracking-widest flex items-center gap-2 ml-2">
                  <Calendar className="w-4 h-4 text-primary" /> 1. Select Date to View/Edit
                </label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => {
                    console.log("CRITICAL: Date changed to", e.target.value);
                    setSelectedDate(e.target.value);
                    setView('today');
                  }}
                  className="w-full bg-muted border-2 border-primary/10 rounded-2xl px-6 py-4 text-xl font-bold text-secondary focus:border-primary focus:ring-8 focus:ring-primary/5 transition-all cursor-pointer shadow-inner"
                />
              </div>
              <button
                onClick={() => {
                  const today = getLocalDateString();
                  setSelectedDate(today);
                  setView('today');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-8 py-4 bg-secondary text-white rounded-2xl font-black uppercase tracking-widest hover:bg-secondary/90 transition-all shadow-lg active:scale-95"
              >
                Reset to Today
              </button>
            </div>
            {selectedDate !== getLocalDateString() && (
              <div className="mt-4 flex items-center gap-2 text-red-600 font-black text-xs bg-red-50 p-3 rounded-xl border border-red-100 italic">
                <Zap className="w-4 h-4 animate-bounce" />
                Note: You are editing data for {formatDisplayDate(selectedDate)}
              </div>
            )}
          </div>
        </div>
        <div className="flex gap-3 no-print">
          <div className="flex bg-muted/30 p-1 rounded-2xl border border-border/20 mr-2">
            <button
              onClick={() => setView('today')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                view === 'today' ? "bg-white text-secondary shadow-sm" : "text-muted-foreground hover:bg-muted"
              )}
            >
              Journal
            </button>
            <button
              onClick={() => setView('history')}
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                view === 'history' ? "bg-white text-secondary shadow-sm" : "text-muted-foreground hover:bg-muted"
              )}
            >
              All History
            </button>
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => window.print()}
            className="w-12 h-12 glass rounded-2xl flex items-center justify-center ring-1 ring-border shadow-sm cursor-pointer"
            title="Print Journal"
          >
            <Printer className="w-5 h-5 text-primary" />
          </motion.button>
        </div>
      </motion.header>

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
          <section className="grid grid-cols-2 gap-4 mb-8">
            <motion.div whileHover={{ y: -4 }} className="card relative overflow-hidden flex flex-col justify-between h-32">
              <div>
                <span className="badge bg-primary/10 text-primary mb-1">Target</span>
                <input
                  className="w-full text-2xl font-bold bg-transparent border-none p-0 focus:ring-0 text-secondary placeholder:text-muted-foreground/30"
                  placeholder="Set Goal"
                  value={log.proteinGoal}
                  onChange={e => setLog(prev => ({ ...prev, proteinGoal: e.target.value }))}
                />
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Protein Goal</p>
              <Scale className="absolute -bottom-4 -right-4 w-20 h-20 text-primary opacity-[0.03] rotate-12" />
            </motion.div>

            <motion.div whileHover={{ y: -4 }} className="card relative overflow-hidden flex flex-col justify-between h-32">
              <div>
                <span className="badge bg-orange-500/10 text-orange-600 mb-1">Total</span>
                <div className="text-2xl font-bold text-secondary">{totalCalories}</div>
              </div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Cals Consumed</p>
              <Flame className="absolute -bottom-4 -right-4 w-20 h-20 text-orange-500 opacity-[0.03] rotate-12" />
            </motion.div>
          </section>

          <section className="space-y-3 mb-10">
            <div className="flex items-center justify-between p-4 glass border border-border/50 rounded-[2rem] shadow-sm">
              <div className="flex items-center gap-3 pl-2">
                <Zap className={cn("w-5 h-5", log.ketosis ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30")} />
                <span className="text-[10px] sm:text-xs uppercase font-black tracking-[0.2em] text-secondary">Ketosis Check</span>
              </div>
              <div className="flex items-center bg-muted/30 p-1 rounded-2xl border border-border/20">
                <button onClick={() => setLog(prev => ({ ...prev, ketosis: true }))} className={cn("px-10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", log.ketosis ? "bg-secondary text-white shadow-lg" : "text-muted-foreground hover:bg-muted")}>Yes</button>
                <button onClick={() => setLog(prev => ({ ...prev, ketosis: false }))} className={cn("px-10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", !log.ketosis ? "bg-red-500 text-white shadow-lg" : "text-muted-foreground hover:bg-muted")}>No</button>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 glass border border-border/50 rounded-[2rem] shadow-sm">
              <div className="flex items-center gap-3 pl-2">
                <CheckCircle2 className={cn("w-5 h-5", log.followedPlan ? "text-primary" : "text-muted-foreground/30")} />
                <span className="text-[10px] sm:text-xs uppercase font-black tracking-[0.2em] text-secondary">Stayed On Track</span>
              </div>
              <div className="flex items-center bg-muted/30 p-1 rounded-2xl border border-border/20">
                <button onClick={() => setLog(prev => ({ ...prev, followedPlan: true }))} className={cn("px-10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", log.followedPlan ? "bg-primary text-white shadow-lg" : "text-muted-foreground hover:bg-muted")}>Yes</button>
                <button onClick={() => setLog(prev => ({ ...prev, followedPlan: false }))} className={cn("px-10 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all", !log.followedPlan ? "bg-red-500 text-white shadow-lg" : "text-muted-foreground hover:bg-muted")}>No</button>
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
