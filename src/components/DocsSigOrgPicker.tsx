/* Searchable organization picker used by Signatures and Documents (design: shared "orgPick"). A secondary
   button shows "num  name"; the menu has a search box and a listbox of organizations. */

import { useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { useDismiss } from './useDismiss';

export interface PickOrg { num: string; name: string }

interface Props {
  id: string;
  orgs: PickOrg[];
  value: string;
  onChange: (num: string) => void;
  placeholder?: string;
  invalid?: boolean;
  describedBy?: string;
  label?: string;
  width?: number | string;
}

export function DocsSigOrgPicker({ id, orgs, value, onChange, placeholder = 'Select an organization', invalid, describedBy, label = 'Organization', width = '100%' }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useDismiss(open, wrap, () => setOpen(false), btn);
  const sel = orgs.find((o) => o.num === value);
  const qn = q.trim().toLowerCase();
  const list = orgs.filter((o) => !qn || o.num.includes(qn) || o.name.toLowerCase().includes(qn));
  const pick = (num: string) => { onChange(num); setOpen(false); btn.current?.focus(); };

  return (
    <div className="cc-dropdown" ref={wrap} style={{ width }}>
      <button
        ref={btn} id={id} type="button" className="cc-btn cc-btn--secondary cc-dropdown__trigger"
        aria-haspopup="listbox" aria-expanded={open} aria-invalid={invalid || undefined} aria-describedby={describedBy}
        aria-label={`${label}: ${sel ? sel.num + ' ' + sel.name : placeholder}`}
        onClick={() => { setOpen((o) => !o); setQ(''); }}
      >
        {sel ? (
          <span className="cc-dropdown__value"><span style={{ color: 'var(--gray-500)', fontWeight: 'var(--fw-regular)', marginRight: 'var(--space-2)', fontVariantNumeric: 'tabular-nums' }}>{sel.num}</span>{sel.name}</span>
        ) : (
          <span className="cc-dropdown__value cc-dropdown__value--placeholder">{placeholder}</span>
        )}
        <ChevronDown className="cc-dropdown__chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="cc-dropdown__menu cc-dropdown__menu--sections cc-dropdown__menu--end" style={{ minWidth: 280 }}>
          <div className="cc-input cc-input--sm cc-dropdown__search" style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Search size={16} aria-hidden="true" style={{ color: 'var(--gray-500)', flexShrink: 0 }} />
            <input
              autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by ID or name" aria-label="Search organizations"
              style={{ flex: 1, minWidth: 0, border: 'none', outline: 'none', background: 'transparent', font: 'inherit', color: 'var(--fg-primary)', padding: 0 }}
            />
          </div>
          <div className="cc-dropdown__list" role="listbox" aria-label="Organizations">
            {list.map((o) => (
              <button key={o.num} type="button" role="option" aria-selected={o.num === value} className="cc-dropdown__option" onClick={() => pick(o.num)}>
                <span style={{ width: 40, flexShrink: 0, color: 'var(--gray-500)', fontWeight: 'var(--fw-regular)', fontVariantNumeric: 'tabular-nums' }}>{o.num}</span>
                <span className="cc-dropdown__label">{o.name}</span>
                {o.num === value && <Check className="cc-dropdown__check" aria-hidden="true" />}
              </button>
            ))}
            {list.length === 0 && <p className="cc-dropdown__empty">No organizations match that search.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
