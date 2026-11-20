/* Shared pieces for Reorder Management and Hold Management: chip filters with draft + Apply,
   an organization picker, a popover menu, an activity timeline and the floating bulk-action bar. */

import { useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, History, Upload } from 'lucide-react';
import { SearchField } from './SearchField';
import { useDismiss } from './useDismiss';
import { useStore } from '../data/store';
import styles from './OrdersMgmtKit.module.css';

export type Applied = Record<string, string[]>;

export interface ChipOption { value: string; label: string; sub?: string; badge?: string }
export interface ChipDef { id: string; label: string; kind: 'plain' | 'badge' | 'dual'; width?: number; options: ChipOption[] }

/* One chip: a small secondary button with a count, opening a searchable checkbox list. */
function Chip({ def, cur, open, onOpen, onClose, onChange }: {
  def: ChipDef; cur: string[]; open: boolean; onOpen: () => void; onClose: () => void; onChange: (v: string[]) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const [q, setQ] = useState('');
  useDismiss(open, wrap, onClose, btn);
  const qn = q.trim().toLowerCase();
  const opts = def.options.filter((o) => !qn || `${o.label} ${o.sub ?? ''}`.toLowerCase().includes(qn));
  const popId = `chip-${def.id}`;
  return (
    <div className={styles.wrap} ref={wrap}>
      <button
        ref={btn} type="button" className={`cc-btn cc-btn--secondary cc-btn--sm ${open || cur.length ? styles.chipOn : ''}`}
        aria-haspopup="dialog" aria-expanded={open} aria-controls={open ? popId : undefined}
        onClick={() => { setQ(''); if (open) onClose(); else onOpen(); }}
      >
        {def.label}
        {cur.length > 0 && <span className={styles.count}>{cur.length}<span className="sr-only"> selected</span></span>}
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div id={popId} role="dialog" aria-label={`${def.label} filter`} className={styles.pop} style={{ width: def.width ?? 240 }}>
          <SearchField value={q} onChange={setQ} placeholder="Search" aria-label={`Search ${def.label.toLowerCase()}`} autoFocus />
          <div className={styles.opts}>
            {opts.map((o, i) => {
              const id = `${popId}-${i}`;
              const on = cur.includes(o.value);
              return (
                <label key={o.value} htmlFor={id} className={styles.opt}>
                  <input id={id} className="cc-checkbox__input" type="checkbox" checked={on}
                    onChange={(e) => onChange(e.target.checked ? [...cur, o.value] : cur.filter((v) => v !== o.value))} />
                  {def.kind === 'badge'
                    ? <span className={`cc-badge cc-badge--square ${o.badge ?? ''}`}>{o.label}</span>
                    : <span className={styles.optText}>{o.label}{o.sub && <span className={styles.optSub}>{o.sub}</span>}</span>}
                </label>
              );
            })}
            {opts.length === 0 && <p className={styles.none}>No matches</p>}
          </div>
          <button type="button" className={styles.clear} aria-disabled={!cur.length} onClick={() => cur.length && onChange([])}>Clear all</button>
        </div>
      )}
    </div>
  );
}

/** Filter bar of chips. Choices are a draft until Apply; Clear all resets both. */
export function ChipFilterBar({ id, defs, applied, onApply, extra }: {
  id: string; defs: ChipDef[]; applied: Applied; onApply: (a: Applied) => void; extra?: ReactNode;
}) {
  const [draft, setDraft] = useState<Applied | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const d = draft ?? applied;
  const dirty = JSON.stringify(d) !== JSON.stringify(applied);
  return (
    <div id={id} role="group" aria-label="Filters" className={styles.bar}>
      {defs.map((def) => (
        <Chip key={def.id} def={def} cur={d[def.id] ?? []} open={openId === def.id}
          onOpen={() => setOpenId(def.id)} onClose={() => setOpenId(null)}
          onChange={(v) => setDraft({ ...d, [def.id]: v })} />
      ))}
      {extra}
      <div className={styles.barEnd}>
        <button type="button" className="cc-link-btn cc-link" onClick={() => { setDraft(null); setOpenId(null); onApply({}); }}>Clear all</button>
        <button type="button" className={`cc-btn cc-btn--sm ${dirty ? 'cc-btn--primary' : 'cc-btn--secondary'}`}
          onClick={() => { setOpenId(null); onApply(d); setDraft(null); }}>Apply filters</button>
      </div>
    </div>
  );
}

export const countApplied = (a: Applied) => Object.values(a).filter((v) => v.length).length;
export const passes = (a: Applied, id: string, v: string) => !(a[id] ?? []).length || a[id].includes(v);

/** Small popover menu anchored to a trigger. */
export function PopMenu({ trigger, label, children, open, setOpen }: {
  trigger: (p: { ref: React.RefObject<HTMLButtonElement>; onClick: () => void; 'aria-expanded': boolean; 'aria-haspopup': 'menu' }) => ReactNode;
  label: string; children: ReactNode; open: boolean; setOpen: (o: boolean) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useDismiss(open, wrap, () => setOpen(false), btn);
  return (
    <div className={styles.wrap} ref={wrap}>
      {trigger({ ref: btn, onClick: () => setOpen(!open), 'aria-expanded': open, 'aria-haspopup': 'menu' })}
      {open && <div role="menu" aria-label={label} className={styles.menu} onClick={() => setOpen(false)}>{children}</div>}
    </div>
  );
}

export function MenuItem({ icon, children, onClick, danger, disabled }: { icon?: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <button type="button" role="menuitem" className={`${styles.menuItem} ${danger ? styles.menuDanger : ''}`} aria-disabled={disabled || undefined}
      onClick={(e) => { if (disabled) { e.stopPropagation(); return; } onClick(); }}>
      {icon}{children}
    </button>
  );
}
export const MenuSep = () => <div role="separator" className={styles.sep} />;

/** Organization picker (first three organizations, like the design). */
export function OrgPicker({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { orgs } = useStore();
  const list = orgs.slice(0, 3);
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  useDismiss(open, wrap, () => setOpen(false), btn);
  const cur = list.find((o) => o.id === value) ?? list[0];
  const qn = q.trim().toLowerCase();
  const opts = list.filter((o) => !qn || `${o.num} ${o.name}`.toLowerCase().includes(qn));
  return (
    <div className={styles.wrap} ref={wrap} style={{ width: 300, maxWidth: '100%' }}>
      <button ref={btn} type="button" className={`cc-btn cc-btn--secondary ${styles.orgBtn}`} aria-haspopup="listbox" aria-expanded={open}
        aria-label={`Organization: ${cur ? `${cur.num} ${cur.name}` : 'none'}`} onClick={() => { setQ(''); setOpen(!open); }}>
        <span style={{ display: 'flex', gap: 'var(--space-2)', minWidth: 0 }}>
          {cur && <><span className={styles.orgNum}>{cur.num}</span><span className={styles.orgName}>{cur.name}</span></>}
        </span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && (
        <div className={`${styles.menu} ${styles.orgMenu}`}>
          <SearchField value={q} onChange={setQ} placeholder="Search by ID or name" aria-label="Search organizations" autoFocus />
          <div role="listbox" aria-label="Organizations" style={{ marginTop: 'var(--space-2)', maxHeight: 280, overflowY: 'auto' }}>
            {opts.map((o) => (
              <button key={o.id} type="button" role="option" aria-selected={o.id === cur?.id} className="cc-dropdown__option"
                onClick={() => { onChange(o.id); setOpen(false); btn.current?.focus(); }}>
                <span className={styles.orgOptNum}>{o.num}</span>
                <span className="cc-dropdown__label">{o.name}</span>
                <Check className="cc-dropdown__check" aria-hidden="true" />
              </button>
            ))}
            {opts.length === 0 && <div className={styles.none}>No organizations match that search.</div>}
          </div>
        </div>
      )}
    </div>
  );
}

export interface Activity { who: string; ini: string; what: string; when: string; ago: string }

export function ActivityList({ items, emptyText }: { items: Activity[]; emptyText?: string }) {
  if (!items.length) {
    return (
      <div className={styles.emptyAct}>
        <History size={24} aria-hidden="true" />
        <div className={styles.emptyActTitle}>No activity yet</div>
        {emptyText && <div className={styles.emptyActText}>{emptyText}</div>}
      </div>
    );
  }
  return (
    <ol className={styles.activity}>
      {items.map((a, i) => (
        <li key={i} className={styles.actItem}>
          <span className={styles.avatar} aria-hidden="true">{a.ini}</span>
          <div>
            <div className={styles.actWho}>{a.who}<span className={styles.actAgo}>{a.ago}</span></div>
            <div className={styles.actWhat}>{a.what}</div>
            <div className={styles.actWhen}>{a.when}</div>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function BulkBar({ children, text, onDeselect }: { children?: ReactNode; text: string; onDeselect: () => void }) {
  return (
    <>
      <div aria-hidden="true" className={styles.bulkSpacer} />
      <div role="toolbar" aria-label="Bulk actions" className={styles.bulk}>
        <button type="button" className="cc-btn cc-btn--tertiary cc-btn--sm" onClick={onDeselect}>Deselect all</button>
        {children}
        <span role="status" className={styles.bulkText}>{text}</span>
      </div>
    </>
  );
}

/** Export popover: all results or the selection. */
export function ExportMenu({ label, selCount, onAll, onSel }: { label: string; selCount: number; onAll: () => void; onSel: () => void }) {
  const [open, setOpen] = useState(false);
  return (
    <PopMenu label="Export" open={open} setOpen={setOpen}
      trigger={(p) => (
        <button {...p} type="button" className="cc-btn cc-btn--secondary" aria-label={label} style={{ width: 40, padding: 0, justifyContent: 'center' }}>
          <UploadIcon />
        </button>
      )}>
      <MenuItem onClick={onAll}>Export all results</MenuItem>
      <MenuItem onClick={onSel} disabled={!selCount}>Export selected ({selCount})</MenuItem>
    </PopMenu>
  );
}
const UploadIcon = () => <Upload size={16} aria-hidden="true" />;
