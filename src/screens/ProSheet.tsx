import { useEffect, useState } from 'react';
import { Check, Sparkles } from 'lucide-react';
import { Sheet } from '../components/ui';
import { getProStatus, purchasePro, restorePro } from '../lib/storekit';

const PRO_BENEFITS = [
  { title: 'Unlimited Daily Journal (Beyond 14-Day Trial)', desc: 'Log VLP/LP/MP protein by the ounce, net carbs, fats, and morning check-ins forever with no subscriptions.' },
  { title: 'Monthly Clinic PDF Printout', desc: 'Export or print your clean monthly food, ketone, and weight summary for clinic weigh-in days.' },
  { title: 'Barcode Net-Carb Scanner', desc: 'Point your camera at any food label to pull in net carbs automatically.' },
  { title: 'Home Screen Widget', desc: 'See net carbs remaining, protein progress, and your streak right on your iPhone Home Screen.' },
  { title: 'Apple Health & iCloud Sync', desc: 'Save check-in weight to Apple Health, read steps & workouts, and sync privately across iPhone & iPad.' },
];

export function ProSheet({ open, reason, onClose, onUnlocked }: {
  open: boolean;
  reason?: string;
  onClose: () => void;
  onUnlocked: () => void;
}) {
  const [price, setPrice] = useState('$4.99');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    setMsg('');
    void getProStatus().then(st => {
      if (st.displayPrice) setPrice(st.displayPrice);
      if (st.unlocked) {
        onUnlocked();
        onClose();
      }
    });
  }, [open, onUnlocked, onClose]);

  const handleBuy = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await purchasePro();
      if (res.unlocked) {
        onUnlocked();
        onClose();
      } else if (res.pending) {
        setMsg('Purchase is pending approval.');
      }
    } catch (err) {
      setMsg((err as Error).message || 'Could not complete purchase right now.');
    } finally {
      setBusy(false);
    }
  };

  const handleRestore = async () => {
    setBusy(true);
    setMsg('');
    try {
      const res = await restorePro();
      if (res.unlocked) {
        onUnlocked();
        onClose();
      } else {
        setMsg('No previous Fuel Tracker Pro purchase found for this Apple Account.');
      }
    } catch (err) {
      setMsg((err as Error).message || 'Could not restore purchase right now.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Sparkles size={20} style={{ color: '#c2410c' }} />
          Fuel Tracker Pro
        </span>
      }
    >
      {reason && (
        <p className="field-help" style={{ marginTop: 0, marginBottom: 12, color: '#c2410c', fontWeight: 600 }}>
          {reason}
        </p>
      )}
      <p className="field-help" style={{ marginTop: 0, marginBottom: 16 }}>
        Try daily VLP/LP/MP meal logging and morning check-ins free for 14 logged days. Unlock unlimited logging plus all clinic and device power tools with a single one-time purchase—no subscriptions.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
        {PRO_BENEFITS.map(b => (
          <div key={b.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
            <span
              style={{
                width: 22,
                height: 22,
                borderRadius: 999,
                background: 'rgba(194, 65, 12, 0.12)',
                color: '#c2410c',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                marginTop: 2,
              }}
            >
              <Check size={14} strokeWidth={2.5} />
            </span>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{b.title}</div>
              <div className="muted" style={{ fontSize: 13, lineHeight: 1.35 }}>{b.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {msg && <p className="status-msg" style={{ marginBottom: 12 }}>{msg}</p>}

      <div className="sheet-footer-inline" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <button className="btn-primary" disabled={busy} onClick={() => void handleBuy()}>
          {busy ? 'Working…' : `Unlock Lifetime Pro · ${price} once`}
        </button>
        <button className="btn-secondary" disabled={busy} onClick={() => void handleRestore()}>
          Restore previous purchase
        </button>
      </div>
    </Sheet>
  );
}
