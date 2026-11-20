/* Filter dropdown for a filter bar (design system "Filter dropdown"): a small secondary button with a count
   of what's chosen, opening a checkbox list with an optional search and Clear all. */

import { useCallback, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { SearchField } from './SearchField';
import { useDismiss } from './useDismiss';

export interface FilterOption {
  value: string;
  label: string;
  /** Short code or ID shown before the label. */
  meta?: string;
}

interface Props {
  id: string;
  label: string;
  options: FilterOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  searchable?: boolean;
  width?: number;
}

export function FilterDropdown({ id, label, options, selected, onChange, searchable = true, width = 240 }: Props) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, wrap, close, btn);

  const query = q.trim().toLowerCase();
  const shown = options.filter((o) => !query || o.label.toLowerCase().includes(query) || (o.meta ?? '').includes(query));
  const toggle = (v: string, on: boolean) => onChange(on ? selected.concat(v) : selected.filter((x) => x !== v));

  return (
    <div className="cc-dropdown" ref={wrap}>
      <button
        ref={btn}
        type="button"
        id={id}
        className="cc-btn cc-btn--secondary cc-btn--sm"
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label}
        {selected.length > 0 && <span className="cc-dropdown__count">{selected.length}</span>}
        <ChevronDown size={16} className="cc-dropdown__chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className="cc-dropdown__menu cc-dropdown__menu--sections" role="group" aria-label={`${label} filter`} style={{ width }}>
          {searchable && (
            <SearchField className="cc-dropdown__search" size="sm" value={q} onChange={setQ} placeholder="Search" aria-label={`Search ${label}`} clearable autoFocus />
          )}
          <fieldset className="cc-dropdown__group cc-dropdown__list">
            <legend className="sr-only">{label}</legend>
            {shown.map((o) => (
              <label key={o.value} className="cc-dropdown__option">
                <input className="cc-checkbox__input" type="checkbox" checked={selected.includes(o.value)} onChange={(e) => toggle(o.value, e.target.checked)} />
                {o.meta && <span className="cc-dropdown__meta">{o.meta}</span>}
                <span className="cc-dropdown__label">{o.label}</span>
              </label>
            ))}
            {shown.length === 0 && <p className="cc-dropdown__empty">No matches</p>}
          </fieldset>
          <div className="cc-dropdown__footer">
            <button type="button" className="cc-link cc-link-btn" onClick={() => onChange([])}>Clear all</button>
          </div>
        </div>
      )}
    </div>
  );
}
