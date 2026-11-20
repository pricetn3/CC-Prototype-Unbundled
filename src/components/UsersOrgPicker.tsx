/* Single-choice organization picker with a search box (design system field dropdown): number + name rows,
   a blue check on the chosen one. Used by Users, Invite user and Reports. */

import { useCallback, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { SearchField } from './SearchField';
import { useDismiss } from './useDismiss';

export interface PickerOrg { key: string; num: string; name: string }

interface Props {
  id: string;
  options: PickerOrg[];
  value: string;
  onChange: (key: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  label?: string;
  invalid?: boolean;
  width?: number | string;
  menuWidth?: number;
  alignEnd?: boolean;
  limit?: number;
}

export function UsersOrgPicker({
  id, options, value, onChange, placeholder = 'Select an organization', searchPlaceholder = 'Search by ID or name',
  label = 'Organization', invalid, width = '100%', menuWidth, alignEnd, limit = 40,
}: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => { setOpen(false); setQ(''); }, []);
  useDismiss(open, wrap, close, btn);

  const sel = options.find((o) => o.key === value);
  const lq = q.trim().toLowerCase();
  const shown = options.filter((o) => !lq || o.name.toLowerCase().includes(lq) || o.num.includes(lq)).slice(0, limit);

  return (
    <div className="cc-dropdown" ref={wrap} style={{ width }}>
      <button
        ref={btn} id={id} type="button" className="cc-btn cc-btn--secondary cc-dropdown__trigger"
        aria-haspopup="listbox" aria-expanded={open} aria-invalid={invalid || undefined}
        aria-label={sel ? `${label}: ${sel.num ? sel.num + ' ' : ''}${sel.name}` : `${label}: ${placeholder}`}
        onClick={() => setOpen((o) => !o)}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', minWidth: 0, flex: 1 }}>
          {sel ? (
            <>
              {sel.num && <span className="cc-dropdown__meta" style={{ minWidth: 0 }}>{sel.num}</span>}
              <span className="cc-dropdown__value">{sel.name}</span>
            </>
          ) : (
            <span className="cc-dropdown__value cc-dropdown__value--placeholder">{placeholder}</span>
          )}
        </span>
        <ChevronDown className="cc-dropdown__chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className={`cc-dropdown__menu cc-dropdown__menu--sections${alignEnd ? ' cc-dropdown__menu--end' : ''}`} style={{ width: menuWidth, minWidth: 280 }}>
          <SearchField className="cc-dropdown__search" size="sm" value={q} onChange={setQ} placeholder={searchPlaceholder} aria-label="Search organizations" clearable autoFocus />
          <div className="cc-dropdown__list" role="listbox" aria-label="Organizations">
            {shown.map((o) => (
              <button
                key={o.key} type="button" role="option" aria-selected={o.key === value} className="cc-dropdown__option"
                onClick={() => { onChange(o.key); close(); btn.current?.focus(); }}
              >
                <span className="cc-dropdown__meta">{o.num || '—'}</span>
                <span className="cc-dropdown__label">{o.name}</span>
                <Check className="cc-dropdown__check" aria-hidden="true" />
              </button>
            ))}
            {shown.length === 0 && <p className="cc-dropdown__empty">No organizations match that search.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
