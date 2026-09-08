import { useState } from 'react';
import { Segmented } from '../components/ui';
import { isNative } from '../lib/native';
import type { Settings, WeightUnit } from '../types';

export function Onboarding({ settings, onDone }: { settings: Settings; onDone: (s: Settings) => void }) {
  const [step, setStep] = useState(0);
  const [proteinGoal, setProteinGoal] = useState(String(settings.proteinGoal));
  const [carbLimit, setCarbLimit] = useState(String(settings.carbLimit));
  const [weightUnit, setWeightUnit] = useState<WeightUnit>(settings.weightUnit);
  const [morning, setMorning] = useState(true);
  const [evening, setEvening] = useState(true);

  const num = (v: string, fallback: number) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n > 0 ? n : fallback;
  };

  const finish = () => {
    onDone({
      ...settings,
      proteinGoal: num(proteinGoal, settings.proteinGoal),
      carbLimit: num(carbLimit, settings.carbLimit),
      weightUnit,
      reminders: { ...settings.reminders, morning: isNative() && morning, evening: isNative() && evening },
      onboardedAt: Date.now(),
    });
  };

  return (
    <div className="onboarding">
      <div className="onboarding-body">
        {step === 0 && (
          <>
            <div className="onboarding-mark" aria-hidden="true">
              <svg viewBox="0 0 1024 1024" width="96" height="96">
                <path d="M560 170 C620 290 735 380 735 540 C735 690 630 820 512 820 C394 820 289 690 289 540 C289 430 370 380 420 300 C445 260 470 220 560 170 Z" fill="var(--primary)" />
                <path d="M512 430 C650 470 680 640 555 775 C420 720 400 540 512 430 Z" fill="var(--background)" />
                <path d="M528 470 C545 580 550 680 555 760" fill="none" stroke="var(--primary)" strokeWidth="18" strokeLinecap="round" />
              </svg>
            </div>
            <h1 className="onboarding-title">Fuel Tracker</h1>
            <p className="onboarding-lead">A journal for the Medi-Weightloss way of eating. Lean protein by the ounce, carbs counted, and a morning check-in so you can see ketosis and weight move week by week.</p>
            <div className="onboarding-tiers">
              <div><strong>VLP</strong><span>Very lean protein · 35 cal per oz</span></div>
              <div><strong>LP</strong><span>Lean protein · 55 cal per oz</span></div>
              <div><strong>MP</strong><span>Medium protein · 75 cal per oz</span></div>
            </div>
            <p className="field-help">Pick the tier, enter the ounces, and the app does the arithmetic. Carbs and fats are counted the same way, by serving.</p>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="onboarding-title">Your targets</h1>
            <p className="onboarding-lead">Use the numbers from your clinic. You can change them any time in Settings.</p>
            <label className="field">
              <span className="field-label">Daily protein goal</span>
              <div className="input-with-unit">
                <input className="input" type="number" inputMode="numeric" value={proteinGoal} onChange={e => setProteinGoal(e.target.value)} />
                <span>kcal</span>
              </div>
            </label>
            <label className="field">
              <span className="field-label">Net carb limit</span>
              <div className="input-with-unit">
                <input className="input" type="number" inputMode="numeric" value={carbLimit} onChange={e => setCarbLimit(e.target.value)} />
                <span>g</span>
              </div>
            </label>
            <div className="field">
              <span className="field-label">Weight unit</span>
              <Segmented<WeightUnit> options={[{ key: 'lb', label: 'Pounds' }, { key: 'kg', label: 'Kilograms' }]} value={weightUnit} onChange={setWeightUnit} />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="onboarding-title">Reminders</h1>
            <p className="onboarding-lead">Two nudges a day keep the streak going. Both can be changed or turned off in Settings.</p>
            <label className="toggle-row card-row">
              <span><strong>Morning check-in</strong><br /><span className="muted">7:30 am · ketones and weight</span></span>
              <input type="checkbox" className="toggle" checked={morning} onChange={e => setMorning(e.target.checked)} />
            </label>
            <label className="toggle-row card-row">
              <span><strong>Evening nudge</strong><br /><span className="muted">7:30 pm · only if nothing was logged</span></span>
              <input type="checkbox" className="toggle" checked={evening} onChange={e => setEvening(e.target.checked)} />
            </label>
            {!isNative() && <p className="field-help">Reminders work in the iPhone and iPad app. They are not available in a web browser.</p>}
            <p className="field-help">For informational purposes only, not medical or nutritional advice. Follow the guidance of your physician or clinic.</p>
          </>
        )}
      </div>

      <div className="onboarding-footer">
        <div className="onboarding-dots" aria-hidden="true">
          {[0, 1, 2].map(i => <span key={i} className={i === step ? 'on' : ''} />)}
        </div>
        {step < 2 ? (
          <button className="btn-primary" onClick={() => setStep(s => s + 1)}>Continue</button>
        ) : (
          <button className="btn-primary" onClick={finish}>Start journaling</button>
        )}
        {step > 0 && <button className="link-btn center" onClick={() => setStep(s => s - 1)}>Back</button>}
      </div>
    </div>
  );
}
