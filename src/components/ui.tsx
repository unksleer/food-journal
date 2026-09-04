import { useRef, useState } from 'react';
import type { ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Trash2 } from 'lucide-react';

export function Card({ children, className = '', style }: { children: ReactNode; className?: string; style?: React.CSSProperties }) {
  return <div className={`card ${className}`} style={style}>{children}</div>;
}

export function SectionLabel({ children, action, onAction }: { children: ReactNode; action?: string; onAction?: () => void }) {
  return (
    <div className="section-label-row">
      <span className="section-label">{children}</span>
      {action && <button className="link-btn" onClick={onAction}>{action}</button>}
    </div>
  );
}

export function ProgressRow({ label, value, max, unit, tone, suffix }: { label: string; value: number; max?: number; unit: string; tone: 'protein' | 'carb' | 'fat'; suffix?: string }) {
  const pct = max && max > 0 ? Math.min(100, (value / max) * 100) : Math.min(100, value / 3);
  const over = !!max && value > max;
  return (
    <div className="progress-row">
      <div className="progress-head">
        <span className="progress-label">{label}</span>
        <span className="progress-value">
          <strong className={over ? 'text-over' : ''}>{Math.round(value)}</strong>
          {max ? ` / ${max} ${unit}` : ` ${unit}`}
          {suffix && <span className="progress-suffix"> {suffix}</span>}
        </span>
      </div>
      <div className={`bar bar-${tone}`}>
        <div className={`bar-fill ${over ? 'bar-over' : ''}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function Segmented<T extends string>({ options, value, onChange, size = 'md' }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void; size?: 'sm' | 'md' }) {
  return (
    <div className={`segmented segmented-${size}`} role="tablist">
      {options.map(o => (
        <button key={o.key} role="tab" aria-selected={o.key === value} className={`segment ${o.key === value ? 'active' : ''}`} onClick={() => onChange(o.key)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Chips<T extends string>({ options, value, onChange }: { options: { key: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="chips">
      {options.map(o => (
        <button key={o.key} className={`chip ${o.key === value ? 'active' : ''}`} onClick={() => onChange(o.key)}>{o.label}</button>
      ))}
    </div>
  );
}

export function Stepper({ value, unit, step, min = 0, onChange }: { value: number; unit: string; step: number; min?: number; onChange: (v: number) => void }) {
  const fmt = (n: number) => (Number.isInteger(n) ? String(n) : n.toFixed(1).replace(/\.0$/, ''));
  return (
    <div className="stepper">
      <div className="stepper-value">
        <input
          className="stepper-input"
          type="number"
          inputMode="decimal"
          step={step}
          min={min}
          value={fmt(value)}
          onChange={e => onChange(Math.max(min, parseFloat(e.target.value) || 0))}
        />
        <span className="stepper-unit">{unit}</span>
      </div>
      <div className="stepper-buttons">
        <button className="stepper-btn" aria-label="Less" onClick={() => onChange(Math.max(min, +(value - step).toFixed(2)))}><Minus size={20} strokeWidth={2.5} /></button>
        <button className="stepper-btn" aria-label="More" onClick={() => onChange(+(value + step).toFixed(2))}><Plus size={20} strokeWidth={2.5} /></button>
      </div>
    </div>
  );
}

export function Scale({ label, value, onChange }: { label: string; value?: number; onChange: (v: number) => void }) {
  return (
    <div className="scale-row">
      <span className="scale-label">{label}</span>
      <div className="scale-dots">
        {[1, 2, 3, 4, 5].map(n => (
          <button key={n} aria-label={`${label} ${n} of 5`} className={`scale-dot ${value && n <= value ? 'on' : ''}`} onClick={() => onChange(value === n ? n - 1 : n)} />
        ))}
      </div>
    </div>
  );
}

/** Row that reveals a delete action on a left swipe, and also on tap for non-touch input. */
export function SwipeRow({ children, onDelete, onTap }: { children: ReactNode; onDelete: () => void; onTap?: () => void }) {
  const [open, setOpen] = useState(false);
  const start = useRef<{ x: number; y: number; t: number } | null>(null);
  const [dx, setDx] = useState(0);
  const REVEAL = 84;

  const onPointerDown = (e: ReactPointerEvent) => {
    start.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onPointerMove = (e: ReactPointerEvent) => {
    if (!start.current) return;
    const ddx = e.clientX - start.current.x;
    const ddy = e.clientY - start.current.y;
    if (Math.abs(ddy) > Math.abs(ddx)) return;
    const base = open ? -REVEAL : 0;
    setDx(Math.max(-REVEAL - 20, Math.min(0, base + ddx)));
  };
  const onPointerUp = (e: ReactPointerEvent) => {
    if (!start.current) return;
    const ddx = e.clientX - start.current.x;
    const quick = Date.now() - start.current.t < 300 && Math.abs(ddx) < 6;
    start.current = null;
    if (quick) {
      if (open) setOpen(false);
      else if (onTap) onTap();
      else setOpen(true);
      setDx(0);
      return;
    }
    setOpen(dx < -REVEAL / 2);
    setDx(0);
  };
  const x = dx !== 0 ? dx : open ? -REVEAL : 0;
  return (
    <div className="swipe-row">
      <button className="swipe-delete" onClick={onDelete} tabIndex={open ? 0 : -1} aria-hidden={!open}>
        <Trash2 size={18} /> Delete
      </button>
      <div
        className="swipe-content"
        style={{ transform: `translateX(${x}px)`, transition: dx !== 0 ? 'none' : 'transform 0.18s ease' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => { start.current = null; setDx(0); }}
      >
        {children}
      </div>
    </div>
  );
}

export function Sheet({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div className="sheet-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            className="sheet"
            role="dialog"
            aria-modal="true"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
          >
            <div className="sheet-grip" />
            <div className="sheet-head">
              <h2 className="sheet-title">{title}</h2>
              <button className="link-btn" onClick={onClose}>Cancel</button>
            </div>
            <div className="sheet-body">{children}</div>
            {footer && <div className="sheet-footer">{footer}</div>}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
