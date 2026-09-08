import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Card, Segmented } from '../components/ui';
import { exportBackup, importBackup } from '../storage';
import { isNative } from '../lib/native';
import { cloudAvailable, fullSync } from '../lib/cloudSync';
import { healthAvailable, requestHealthAccess } from '../lib/health';
import { clearWidget } from '../lib/widget';
import type { Integrations } from '../types';
import type { KetoneMethod, Settings as SettingsData, WeightUnit } from '../types';

export function SettingsScreen({ settings, onChange, onDataChanged }: {
  settings: SettingsData;
  onChange: (s: SettingsData) => void;
  onDataChanged: () => void;
}) {
  const [msg, setMsg] = useState<string>('');
  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);
  const [intMsg, setIntMsg] = useState<Partial<Record<keyof Integrations, string>>>({});
  const [busy, setBusy] = useState<string>('');

  const setIntegration = (patch: Partial<Integrations>) => onChange({ ...settings, integrations: { ...settings.integrations, ...patch } });
  const note = (k: keyof Integrations, text: string) => setIntMsg(m => ({ ...m, [k]: text }));

  const toggleCloud = async (on: boolean) => {
    if (!on) { setIntegration({ icloud: false }); note('icloud', 'Off. Your journal stays on this device.'); return; }
    setBusy('icloud');
    const ok = await cloudAvailable();
    if (!ok) { setBusy(''); note('icloud', isNative() ? 'This iPhone is not signed in to iCloud, or iCloud Drive is off for this app in Settings.' : 'iCloud sync works in the iPhone and iPad app.'); return; }
    setIntegration({ icloud: true });
    const r = await fullSync();
    setBusy('');
    note('icloud', `On. ${r.pushed} ${r.pushed === 1 ? 'day' : 'days'} uploaded, ${r.pulled} pulled from your other devices.`);
    onDataChanged();
  };

  const toggleHealth = async (on: boolean) => {
    if (!on) { setIntegration({ health: false }); note('health', 'Off.'); return; }
    setBusy('health');
    const avail = await healthAvailable();
    if (!avail) { setBusy(''); note('health', isNative() ? 'Apple Health is not available on this device.' : 'Apple Health works in the iPhone app.'); return; }
    const r = await requestHealthAccess(settings.integrations.healthWriteWeight, settings.integrations.healthReadActivity);
    setBusy('');
    setIntegration({ health: true });
    note('health', r.write ? 'On. Weight from check-in is saved to Health.' : 'On. If you declined something, you can change it in the Health app under Sharing.');
  };

  const toggleWidget = async (on: boolean) => {
    setIntegration({ widget: on });
    if (!on) await clearWidget();
    note('widget', on ? 'On. Add the Fuel Tracker widget from your home screen: long-press, tap +, search Fuel Tracker.' : 'Off. The widget will show nothing logged.');
  };

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
        <span className="row-title">Reminders</span>
        {!isNative() && <p className="field-help">Reminders are delivered by the iPhone and iPad app, not the web version.</p>}
        <label className="setting-row">
          <span>Morning check-in</span>
          <span className="setting-input">
            <input className="input input-time" type="time" value={settings.reminders.morningTime} onChange={e => onChange({ ...settings, reminders: { ...settings.reminders, morningTime: e.target.value || '07:30' } })} />
            <input type="checkbox" className="toggle" checked={settings.reminders.morning} onChange={e => onChange({ ...settings, reminders: { ...settings.reminders, morning: e.target.checked } })} />
          </span>
        </label>
        <label className="setting-row">
          <span>Evening nudge<br /><span className="muted">only if nothing was logged</span></span>
          <span className="setting-input">
            <input className="input input-time" type="time" value={settings.reminders.eveningTime} onChange={e => onChange({ ...settings, reminders: { ...settings.reminders, eveningTime: e.target.value || '19:30' } })} />
            <input type="checkbox" className="toggle" checked={settings.reminders.evening} onChange={e => onChange({ ...settings, reminders: { ...settings.reminders, evening: e.target.checked } })} />
          </span>
        </label>
      </Card>

      <Card>
        <span className="row-title">Integrations</span>
        <p className="field-help">All optional and off by default. Each one asks iOS for permission the first time you turn it on.</p>

        <div className="int-row">
          <label className="setting-row">
            <span><strong>iCloud sync</strong><br /><span className="muted">Same journal on your iPhone and iPad</span></span>
            <input type="checkbox" className="toggle" checked={settings.integrations.icloud} disabled={busy === 'icloud'} onChange={e => void toggleCloud(e.target.checked)} />
          </label>
          {intMsg.icloud && <p className="int-note">{intMsg.icloud}</p>}
          {settings.integrations.icloud && (
            <button className="btn-secondary" disabled={busy === 'icloud'} onClick={async () => { setBusy('icloud'); const r = await fullSync(); setBusy(''); note('icloud', r.available ? `Synced. ${r.pushed} sent, ${r.pulled} received.` : 'iCloud is not reachable right now.'); onDataChanged(); }}>Sync now</button>
          )}
        </div>

        <div className="int-row">
          <label className="setting-row">
            <span><strong>Apple Health</strong><br /><span className="muted">Save weight, read steps and workouts</span></span>
            <input type="checkbox" className="toggle" checked={settings.integrations.health} disabled={busy === 'health'} onChange={e => void toggleHealth(e.target.checked)} />
          </label>
          {settings.integrations.health && (
            <>
              <label className="setting-row sub">
                <span>Save check-in weight to Health</span>
                <input type="checkbox" className="toggle" checked={settings.integrations.healthWriteWeight} onChange={e => setIntegration({ healthWriteWeight: e.target.checked })} />
              </label>
              <label className="setting-row sub">
                <span>Show steps and workouts on Today</span>
                <input type="checkbox" className="toggle" checked={settings.integrations.healthReadActivity} onChange={e => setIntegration({ healthReadActivity: e.target.checked })} />
              </label>
            </>
          )}
          {intMsg.health && <p className="int-note">{intMsg.health}</p>}
        </div>

        <div className="int-row">
          <label className="setting-row">
            <span><strong>Barcode scanner</strong><br /><span className="muted">Scan a label to fill in net carbs</span></span>
            <input type="checkbox" className="toggle" checked={settings.integrations.barcode} onChange={e => { setIntegration({ barcode: e.target.checked }); note('barcode', e.target.checked ? 'On. A Scan button appears on the Carbs tab when adding food. Uses the free Open Food Facts database.' : 'Off.'); }} />
          </label>
          {intMsg.barcode && <p className="int-note">{intMsg.barcode}</p>}
        </div>

        <div className="int-row">
          <label className="setting-row">
            <span><strong>Home screen widget</strong><br /><span className="muted">Carbs left and protein at a glance</span></span>
            <input type="checkbox" className="toggle" checked={settings.integrations.widget} onChange={e => void toggleWidget(e.target.checked)} />
          </label>
          {intMsg.widget && <p className="int-note">{intMsg.widget}</p>}
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
        <p className="field-help">{settings.integrations.icloud ? 'Your journal is on this device and in your iCloud. A backup is still a good idea before changing phones.' : 'Everything is stored on this device only. Export a backup before changing phones.'}</p>
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
