import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';
import { CloseIcon } from './icons';

export function Panel({
  title,
  accent,
  watermark,
  children,
}: {
  title?: string;
  accent?: string;
  watermark?: string;
  children: ComponentChildren;
}) {
  return (
    <section class="panel" data-accent={accent ? '' : undefined} style={accent ? { '--accent': accent } : undefined}>
      <div class="panel-in">
        {watermark && <div class="watermark" aria-hidden="true">{watermark}</div>}
        {title && <h2 class="panel-title">{title}</h2>}
        {children}
      </div>
    </section>
  );
}

export function Bar({ value, label, accent }: { value: number; label: string; accent?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div class="bar" style={accent ? { '--accent': accent } : undefined} role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${pct}%` }} />
      <span>{label}</span>
    </div>
  );
}

/** Omit `onClose` for sheets the player must answer (save recovery). */
export function Sheet({ title, onClose, children }: { title: string; onClose?: () => void; children: ComponentChildren }) {
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    addEventListener('keydown', onKey);
    return () => removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div class="backdrop" onPointerDown={(e) => onClose && e.target === e.currentTarget && onClose()}>
      <div class="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div class="sheet-head">
          <h2>{title}</h2>
          {onClose && (
            <button class="icon-btn" onClick={onClose} aria-label="Close">
              <CloseIcon />
            </button>
          )}
        </div>
        <div class="sheet-body">{children}</div>
      </div>
    </div>
  );
}

export function Toggle({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button class="toggle" role="switch" aria-checked={on} onClick={() => onChange(!on)}>
      <span>{label}</span>
      <span class="sw" />
    </button>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: Array<{ id: T; label: string }>;
  onChange: (v: T) => void;
}) {
  return (
    <div class="seg" role="group">
      {options.map((o) => (
        <button key={o.id} aria-pressed={o.id === value} onClick={() => onChange(o.id)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export const Kv = ({ k, v }: { k: string; v: ComponentChildren }) => (
  <div class="kv">
    <span class="muted">{k}</span>
    <b>{v}</b>
  </div>
);
