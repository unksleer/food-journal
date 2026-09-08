import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Card, Scale, Segmented } from '../components/ui';
import { ketoneUnit, ketoneZone } from '../lib/nutrition';
import { formatShort, isToday } from '../lib/date';
import type { Checkin as CheckinData, DayLog, KetoneMethod, Settings } from '../types';

const METHODS: { key: KetoneMethod; label: string }[] = [
  { key: 'blood', label: 'Blood' },
  { key: 'breath', label: 'Breath' },
  { key: 'strips', label: 'Strips' },
];

export function Checkin({ day, previousWeight, settings, onSave, onBack }: {
  day: DayLog;
  previousWeight?: number;
  settings: Settings;
  onSave: (c: CheckinData) => void;
  onBack: () => void;
}) {
  const [method, setMethod] = useState<KetoneMethod>(day.checkin.ketoneMethod ?? settings.ketoneMethod);
  const [ketones, setKetones] = useState<string>(day.checkin.ketones?.toString() ?? '');
  const [weight, setWeight] = useState<string>(day.checkin.weight?.toString() ?? '');
  const [energy, setEnergy] = useState<number | undefined>(day.checkin.energy);
  const [hunger, setHunger] = useState<number | undefined>(day.checkin.hunger);
  const [sleep, setSleep] = useState<number | undefined>(day.checkin.sleep);


  const kNum = ketones === '' ? undefined : parseFloat(ketones);
  const zone = ketoneZone(kNum, method);
  const wNum = weight === '' ? undefined : parseFloat(weight);
  const delta = wNum !== undefined && previousWeight !== undefined ? wNum - previousWeight : undefined;

  const save = () => {
    const c: CheckinData = { savedAt: Date.now() };
    if (kNum !== undefined && Number.isFinite(kNum)) { c.ketones = kNum; c.ketoneMethod = method; }
    if (wNum !== undefined && Number.isFinite(wNum)) c.weight = wNum;
    if (energy) c.energy = energy;
    if (hunger) c.hunger = hunger;
    if (sleep) c.sleep = sleep;
    onSave(c);
    onBack();
  };

  const bloodStops = [
    { pct: 10, cls: 'z-none' }, { pct: 20, cls: 'z-light' }, { pct: 50, cls: 'z-optimal' }, { pct: 20, cls: 'z-high' },
  ];

  return (
    <div className="screen">
      <header className="screen-head">
        <button className="back-btn" onClick={onBack}><ChevronLeft size={22} /> {isToday(day.date) ? 'Today' : formatShort(day.date)}</button>
      </header>
      <h1 className="screen-title">{isToday(day.date) ? 'Morning check-in' : `Check-in · ${formatShort(day.date)}`}</h1>

      <Card className="checkin-card">
        <div className="row-between">
          <span className="row-title">Ketones</span>
          <Segmented options={METHODS} value={method} onChange={setMethod} size="sm" />
        </div>
        <div className="big-input-row">
          <input className="big-input" type="number" inputMode="decimal" step={method === 'blood' ? 0.1 : 1} min={0} placeholder={method === 'blood' ? '1.5' : method === 'breath' ? '10' : '15'} value={ketones} onChange={e => setKetones(e.target.value)} />
          <span className="big-unit">{ketoneUnit(method)}</span>
        </div>
        {method === 'blood' && (
          <div className="zone-gauge">
            <div className="zone-bar">
              {bloodStops.map((s, i) => <span key={i} className={s.cls} style={{ width: `${s.pct}%` }} />)}
              {kNum !== undefined && Number.isFinite(kNum) && (
                <span className="zone-marker" style={{ left: `${Math.min(100, Math.max(0, (kNum / 5) * 100))}%` }} />
              )}
            </div>
            <div className="zone-labels">
              <span>0</span><span>0.5 light</span><span>1.5–3.0 optimal</span><span>5+</span>
            </div>
          </div>
        )}
        {zone && (
          <div className="ketosis-line static">
            <span className={`dot dot-${zone.key}`} />
            <strong>{zone.label}</strong>
          </div>
        )}
        <p className="field-help">Ranges are general guidance, not medical advice. Follow your clinic's targets.</p>
      </Card>

      <Card className="weight-card">
        <div className="weight-text">
          <span className="row-title">Weight</span>
          {delta !== undefined ? (
            <span className="muted">{delta === 0 ? 'No change' : `${delta < 0 ? 'Down' : 'Up'} ${Math.abs(delta).toFixed(1)} ${settings.weightUnit}`} since last entry</span>
          ) : (
            <span className="muted">Optional</span>
          )}
        </div>
        <div className="weight-input-row">
          <input className="weight-input" type="number" inputMode="decimal" step={0.1} min={0} placeholder="—" value={weight} onChange={e => setWeight(e.target.value)} />
          <span className="big-unit">{settings.weightUnit}</span>
        </div>
      </Card>

      <Card>
        <span className="row-title">How do you feel?</span>
        <div className="scales">
          <Scale label="Energy" value={energy} onChange={setEnergy} />
          <Scale label="Hunger" value={hunger} onChange={setHunger} />
          <Scale label="Sleep" value={sleep} onChange={setSleep} />
        </div>
      </Card>

      <div className="sticky-footer">
        <button className="btn-primary" onClick={save}>Save check-in</button>
      </div>
    </div>
  );
}
