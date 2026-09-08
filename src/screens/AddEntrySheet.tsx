import { useMemo, useState } from 'react';
import { ScanBarcode } from 'lucide-react';
import { lookupBarcode, scanBarcode } from '../lib/barcode';
import { isNative } from '../lib/native';
import { Sheet, Chips, Stepper } from '../components/ui';
import { suggestFoods } from '../lib/foods';
import type { FoodSuggestion } from '../lib/foods';
import { defaultTier, tierInfo, tiersFor, valueUnit } from '../lib/nutrition';
import { MEALS, uid } from '../types';
import type { Entry, EntryKind, Favorite, Meal, Tier } from '../types';

export interface AddEntryRequest {
  meal: Meal;
  kind?: EntryKind;
  favorite?: Favorite;
  editing?: Entry;
}

const KINDS: { key: EntryKind; label: string }[] = [
  { key: 'protein', label: 'Protein' },
  { key: 'carb', label: 'Carbs' },
  { key: 'fat', label: 'Fat' },
];

interface FormProps {
  request: AddEntryRequest;
  foodIndex: FoodSuggestion[];
  barcodeEnabled: boolean;
  onClose: () => void;
  onSave: (entry: Entry) => void;
  onSaveFavorite: (fav: Favorite) => void;
}

export function AddEntrySheet({ request, formKey, foodIndex, barcodeEnabled, onClose, onSave, onSaveFavorite }: {
  request: AddEntryRequest | null;
  /** Changes on every open so the form starts fresh. */
  formKey: number;
  foodIndex: FoodSuggestion[];
  barcodeEnabled: boolean;
  onClose: () => void;
  onSave: (entry: Entry) => void;
  onSaveFavorite: (fav: Favorite) => void;
}) {
  const mealLabel = request ? MEALS.find(m => m.key === (request.editing?.meal ?? request.meal))?.label.toLowerCase() : '';
  return (
    <Sheet open={!!request} onClose={onClose} title={request?.editing ? 'Edit entry' : `Add to ${mealLabel}`}>
      {request && <EntryForm key={formKey} request={request} foodIndex={foodIndex} barcodeEnabled={barcodeEnabled} onClose={onClose} onSave={onSave} onSaveFavorite={onSaveFavorite} />}
    </Sheet>
  );
}

function EntryForm({ request, foodIndex, barcodeEnabled, onClose, onSave, onSaveFavorite }: FormProps) {
  const src = request.editing ?? request.favorite;
  const initialKind: EntryKind = src?.kind ?? request.kind ?? 'protein';
  const [kind, setKind] = useState<EntryKind>(initialKind);
  const [name, setName] = useState(src?.name ?? '');
  const [tier, setTier] = useState<Tier>(src?.tier ?? defaultTier(initialKind));
  const [amount, setAmount] = useState(src?.amount ?? (initialKind === 'protein' ? 3 : 1));
  const [value, setValue] = useState(src?.value ?? 0);
  const [valueTouched, setValueTouched] = useState(!!src);
  const [meal, setMeal] = useState<Meal>(request.editing?.meal ?? request.meal);
  const [favorite, setFavorite] = useState(false);
  const [picked, setPicked] = useState<string | null>(src ? `${src.kind}:${src.name}` : null);
  const [scanMsg, setScanMsg] = useState('');
  const [scanning, setScanning] = useState(false);

  const scan = async () => {
    setScanMsg('');
    setScanning(true);
    try {
      const code = await scanBarcode();
      if (!code) { setScanMsg('No barcode read.'); return; }
      const food = await lookupBarcode(code);
      if (!food) { setScanMsg(`Barcode ${code} is not in the database yet. Enter the carbs from the label.`); return; }
      setName(food.brand ? `${food.name} (${food.brand})` : food.name);
      setTier('G');
      setAmount(1);
      setValue(Math.round(food.netCarbs));
      setValueTouched(true);
      setPicked(`carb:${food.name}`);
      setScanMsg(food.perServing ? `${food.netCarbs} g net carbs per serving${food.servingSize ? ` (${food.servingSize})` : ''}, from the label.` : `${food.netCarbs} g net carbs per 100 g. Adjust the amount to your portion.`);
    } catch (err) {
      console.warn(err);
      setScanMsg('Could not look that up. Check your connection and try again.');
    } finally {
      setScanning(false);
    }
  };

  const suggestions = useMemo(() => (request.editing ? [] : suggestFoods(foodIndex, kind, name, name.trim() ? 5 : 6)), [foodIndex, kind, name, request.editing]);
  const showSuggestions = suggestions.length > 0 && picked !== `${kind}:${name}`;

  const pickSuggestion = (f: FoodSuggestion) => {
    setName(f.name);
    setTier(f.tier ?? defaultTier(f.kind));
    setAmount(f.amount);
    setValue(f.value);
    setValueTouched(true);
    setPicked(`${f.kind}:${f.name}`);
  };

  const info = tierInfo(tier);
  const computed = useMemo(() => (info ? Math.round(info.perUnit * amount) : 0), [info, amount]);
  const shownValue = valueTouched ? value : computed;
  const unit = info?.unit ?? (kind === 'protein' ? 'oz' : 'serving');

  const changeKind = (k: EntryKind) => {
    setKind(k);
    setTier(defaultTier(k));
    setAmount(k === 'protein' ? 3 : 1);
    setValueTouched(false);
  };
  const changeTier = (t: Tier) => { setTier(t); setValueTouched(false); };
  const changeAmount = (a: number) => { setAmount(a); setValueTouched(false); };

  const canSave = name.trim().length > 0 && shownValue >= 0;

  const save = () => {
    if (!canSave) return;
    const entry: Entry = {
      id: request.editing?.id ?? uid(),
      kind,
      name: name.trim(),
      tier,
      amount,
      unit,
      value: shownValue,
      meal,
      createdAt: request.editing?.createdAt ?? Date.now(),
    };
    onSave(entry);
    if (favorite) onSaveFavorite({ id: uid(), kind, name: entry.name, tier, amount, unit, value: shownValue });
    onClose();
  };

  const vUnit = valueUnit(kind);

  return (
    <>
      <div className="segmented" role="tablist">
        {KINDS.map(k => (
          <button key={k.key} role="tab" aria-selected={kind === k.key} className={`segment ${kind === k.key ? 'active' : ''}`} onClick={() => changeKind(k.key)}>{k.label}</button>
        ))}
      </div>

      <div className="field">
        <label className="field-label" htmlFor="food-name">Food</label>
        <input id="food-name" className="input" placeholder={kind === 'protein' ? 'Grilled chicken' : kind === 'carb' ? 'Broccoli' : 'Olive oil'} value={name} onChange={e => { setName(e.target.value); setPicked(null); }} autoFocus={!request.editing} autoComplete="off" />
        {kind === 'carb' && barcodeEnabled && isNative() && !request.editing && (
          <button className="scan-btn" onClick={scan} disabled={scanning}><ScanBarcode size={18} /> {scanning ? 'Scanning…' : 'Scan barcode'}</button>
        )}
        {scanMsg && <p className="field-help">{scanMsg}</p>}
        {showSuggestions && (
          <div className="suggestions" role="listbox" aria-label={name.trim() ? 'Matching foods' : 'Recent foods'}>
            {!name.trim() && <span className="suggestions-label">Recent</span>}
            {suggestions.map(f => (
              <button key={f.key} role="option" aria-selected={false} className="suggestion" onClick={() => pickSuggestion(f)}>
                <span className="suggestion-name">{f.name}</span>
                <span className="suggestion-meta">{f.tier ? `${f.tier} · ` : ''}{f.amount} {f.unit}{f.unit === 'serving' && f.amount !== 1 ? 's' : ''} · {f.value} {valueUnit(f.kind)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="field">
        <span className="field-label">{kind === 'protein' ? 'Protein type' : kind === 'carb' ? 'Carb type' : 'Type'}</span>
        <div className={`tier-grid tier-grid-${tiersFor(kind).length}`}>
          {tiersFor(kind).map(t => (
            <button key={t.key} className={`tier-card ${tier === t.key ? 'active' : ''}`} onClick={() => changeTier(t.key)}>
              <span className="tier-short">{t.short}</span>
              <span className="tier-label">{t.label}</span>
              <span className="tier-hint">{t.perUnit ? `${t.perUnit} ${vUnit} / ${t.unit}` : 'from label'}</span>
            </button>
          ))}
        </div>
        {info && <p className="field-help">{info.hint}</p>}
      </div>

      <div className="field">
        <span className="field-label">Amount</span>
        <Stepper value={amount} unit={unit === 'serving' && amount !== 1 ? 'servings' : unit} step={kind === 'protein' ? 1 : 0.5} onChange={changeAmount} />
        <div className="calc-row">
          <span className="calc-formula">{info && info.perUnit > 0 ? `${amount} ${unit} × ${info.perUnit} ${vUnit}` : 'Enter the value yourself'}</span>
          <span className="calc-result">
            = <input className="calc-input" type="number" inputMode="numeric" value={shownValue} onChange={e => { setValueTouched(true); setValue(Math.max(0, parseFloat(e.target.value) || 0)); }} /> {vUnit}
          </span>
        </div>
      </div>

      <div className="field">
        <span className="field-label">Meal</span>
        <Chips options={MEALS} value={meal} onChange={setMeal} />
      </div>

      {!request.editing && (
        <label className="toggle-row">
          <span>Save to quick add</span>
          <input type="checkbox" className="toggle" checked={favorite} onChange={e => setFavorite(e.target.checked)} />
        </label>
      )}
      <div className="sheet-footer-inline">
        <button className="btn-primary" disabled={!canSave} onClick={save}>
          {request.editing ? 'Save changes' : `Add ${shownValue} ${vUnit}`}
        </button>
      </div>
    </>
  );
}
