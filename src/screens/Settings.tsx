import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Card, Segmented } from '../components/ui';
import { exportBackup, importBackup } from '../storage';
import type { KetoneMethod, Settings as SettingsData, WeightUnit } from '../types';

export function SettingsScreen({ settings, onChange, onDataChanged }: {
  settings: SettingsData;
  onChange: (s: SettingsData) => void;
  onDataChanged: () => void;
}) {
  const [msg, setMsg] = useState<string>('');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  const num = (v: string, fallback: number) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  const doExport = async () => {
    const json = JSON.stringify(exportBackup(), null, 2);
    const name = `fuel-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    try {
      const nav = navigator as Navigator & { canShare?: (d: ShareData) => boolean };
      const file = new File([json], name, { type: 'application/json' });
      if (nav.share && (!nav.canShare || nav.canShare({ files: [file] }))) {
        await nav.share({ files: [file], title: 'Fuel Tracker backup' });
        setMsg('Backup shared.');
        return;
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(json);
      setMsg('Backup copied to the clipboard. Paste it somewhere safe.');
    } catch {
      setMsg('Could not export on this device.');
    }
  };

  const doImport = () => {
    try {
      const r = importBackup(importText);
      setMsg(`Imported ${r.days} ${r.days === 1 ? 'day' : 'days'}.`);
      setImportText('');
      setShowImport(false);
      onDataChanged();
    } catch (err) {
      setMsg(`Import failed: ${(err as Error).message}`);
    }
  };

  return (
    <div className="screen">
      <header className="screen-head">
        <div className="screen-title-block">
          <span className="eyebrow">Fuel Tracker</span>
          <h1 className="screen-title">Settings</h1>
        </div>
      </header>

      <Card>
        <span className="row-title">Daily targets</span>
        <label className="setting-row">
          <span>Protein goal</span>
          <span className="setting-input"><input className="input input-num" type="number" inputMode="numeric" value={settings.proteinGoal} onChange={e => onChange({ ...settings, proteinGoal: num(e.target.value, settings.proteinGoal) })} /> kcal</span>
        </label>
        <label className="setting-row">
          <span>Net carb limit</span>
          <span className="setting-input"><input className="input input-num" type="number" inputMode="numeric" value={settings.carbLimit} onChange={e => onChange({ ...settings, carbLimit: num(e.target.value, settings.carbLimit) })} /> g</span>
        </label>
        <label className="setting-row">
          <span>Water goal</span>
          <span className="setting-input"><input className="input input-num" type="number" inputMode="numeric" value={settings.waterGoal} onChange={e => onChange({ ...settings, waterGoal: Math.min(16, num(e.target.value, settings.waterGoal)) })} /> glasses</span>
        </label>
      </Card>

      <Card>
        <span className="row-title">Check-in</span>
        <div className="setting-row">
          <span>Ketone method</span>
          <Segmented<KetoneMethod> options={[{ key: 'blood', label: 'Blood' }, { key: 'breath', label: 'Breath' }, { key: 'strips', label: 'Strips' }]} value={settings.ketoneMethod} onChange={v => onChange({ ...settings, ketoneMethod: v })} size="sm" />
        </div>
        <div className="setting-row">
          <span>Weight unit</span>
          <Segmented<WeightUnit> options={[{ key: 'lb', label: 'lb' }, { key: 'kg', label: 'kg' }]} value={settings.weightUnit} onChange={v => onChange({ ...settings, weightUnit: v })} size="sm" />
        </div>
      </Card>

      <Card>
        <span className="row-title">Quick add</span>
        {settings.favorites.length === 0 ? (
          <p className="empty-note">Turn on “Save to quick add” when adding a food to keep it here.</p>
        ) : (
          settings.favorites.map(f => (
            <div key={f.id} className="fav-row">
              <span className={`tier-tag tone-${f.kind}`}>{f.tier ?? '·'}</span>
              <span className="fav-name">{f.name}</span>
              <span className="muted">{f.amount} {f.unit} · {f.value}{f.kind === 'protein' ? ' kcal' : ' g'}</span>
              <button className="icon-btn-sm" aria-label={`Remove ${f.name}`} onClick={() => onChange({ ...settings, favorites: settings.favorites.filter(x => x.id !== f.id) })}><Trash2 size={16} /></button>
            </div>
          ))
        )}
      </Card>

      <Card>
        <span className="row-title">Your data</span>
        <p className="field-help">Everything is stored on this device only. Export a backup before changing phones.</p>
        <div className="btn-row">
          <button className="btn-secondary" onClick={doExport}>Export backup</button>
          <button className="btn-secondary" onClick={() => setShowImport(s => !s)}>Import backup</button>
        </div>
        {showImport && (
          <div className="import-box">
            <textarea className="textarea" placeholder="Paste a backup here" value={importText} onChange={e => setImportText(e.target.value)} />
            <button className="btn-primary" disabled={!importText.trim()} onClick={doImport}>Import</button>
          </div>
        )}
        {msg && <p className="status-msg">{msg}</p>}
      </Card>

      <Card>
        <p className="field-help">
          Fuel Tracker is a journal for the Medi-Weightloss style of eating: lean protein by the ounce, counted carbs, healthy fats. It is for informational purposes only and is not medical or nutritional advice. Follow the guidance of your physician or clinic.
        </p>
        <p className="version">Version 1.1</p>
      </Card>
    </div>
  );
}
