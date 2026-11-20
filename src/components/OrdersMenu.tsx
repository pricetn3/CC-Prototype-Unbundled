/* Single-select dropdown used across the Orders area (date range, filter facets, carrier, address and
   organization pickers): a trigger button opening a cc-dropdown menu, with an optional search box. */

import { useCallback, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { SearchField } from './SearchField';
import { useDismiss } from './useDismiss';

export interface OrdersMenuOption {
  value: string;
  label: string;
  /** Short code shown before the label (an org ID). */
  meta?: string;
  /** Second line under the label. */
  sub?: string;
}

interface Props {
  id: string;
  /** Trigger content; defaults to a chevron button with `buttonLabel`. */
  buttonLabel: ReactNode;
  options: OrdersMenuOption[];
  value: string | null;
  onChange: (value: string) => void;
  buttonClassName?: string;
  buttonStyle?: React.CSSProperties;
  menuWidth?: number | string;
  align?: 'start' | 'end';
  searchPlaceholder?: string;
  emptyText?: string;
  ariaLabel?: string;
  invalid?: boolean;
  describedBy?: string;
  hideChevron?: boolean;
  icon?: ReactNode;
}

export function OrdersMenu({
  id, buttonLabel, options, value, onChange, buttonClassName = 'cc-btn cc-btn--secondary', buttonStyle, menuWidth = 220,
  align = 'start', searchPlaceholder, emptyText = 'No matches', ariaLabel, invalid, describedBy, hideChevron, icon,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => { setOpen(false); setQ(''); }, []);
  useDismiss(open, wrap, close, btn);

  const qn = q.trim().toLowerCase();
  const shown = options.filter((o) => !qn || o.label.toLowerCase().includes(qn) || (o.meta ?? '').toLowerCase().includes(qn));

  return (
    <div className="cc-dropdown" ref={wrap}>
      <button
        ref={btn}
        id={id}
        type="button"
        className={buttonClassName}
        style={{ ...buttonStyle, ...(invalid ? { borderColor: 'var(--error-500)' } : null) }}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => (open ? close() : setOpen(true))}
      >
        {icon}
        {buttonLabel}
        {!hideChevron && <ChevronDown size={16} className="cc-dropdown__chevron" aria-hidden="true" style={{ marginLeft: 'auto' }} />}
      </button>
      {open && (
        <div className={'cc-dropdown__menu' + (align === 'end' ? ' cc-dropdown__menu--end' : '')} style={{ width: menuWidth }}>
          {searchPlaceholder && (
            <SearchField size="sm" value={q} onChange={setQ} placeholder={searchPlaceholder} aria-label={searchPlaceholder} clearable autoFocus className="cc-dropdown__search" />
          )}
          <div role="listbox" aria-labelledby={id}>
            {shown.map((o) => {
              const sel = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={sel}
                  className="cc-dropdown__option"
                  style={{ fontWeight: sel ? 'var(--fw-semibold)' : 'var(--fw-regular)', alignItems: o.sub ? 'flex-start' : undefined }}
                  onClick={() => { onChange(o.value); close(); btn.current?.focus(); }}
                >
                  {o.meta && <span className="cc-dropdown__meta">{o.meta}</span>}
                  <span className="cc-dropdown__label" style={o.sub ? { whiteSpace: 'normal' } : undefined}>
                    {o.label}
                    {o.sub && <span style={{ display: 'block', font: 'var(--fw-regular) var(--text-xs-size)/var(--text-xs-lh) var(--font-body)', color: 'var(--fg-secondary)' }}>{o.sub}</span>}
                  </span>
                  {sel && <Check size={16} className="cc-dropdown__check" aria-hidden="true" style={{ color: 'var(--blue-600)' }} />}
                </button>
              );
            })}
            {shown.length === 0 && <p className="cc-dropdown__empty">{emptyText}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
