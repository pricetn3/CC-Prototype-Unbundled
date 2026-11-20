/* Admin › Action log: read-only record of settings changes, with search, filters and a date range. */

import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronDown, FileText, ListFilter, Search } from 'lucide-react';
import { useStore } from '../data/store';
import { LOG_AREAS, LOG_TYPES, isLongValue, logISODate, logTime, type LogEntry } from '../data/actionLog';
import { CCTable } from '../components/CCTable';
import { SearchField } from '../components/SearchField';
import { FilterDropdown } from '../components/FilterDropdown';
import { Dialog } from '../components/Dialog';
import { useDismiss } from '../components/useDismiss';
import styles from './Admin.module.css';

type FacetKey = 'org' | 'user' | 'area' | 'type';
type Filters = Record<FacetKey, string[]>;
const EMPTY: Filters = { org: [], user: [], area: [], type: [] };

type Preset = 'today' | '7' | '30' | '90' | 'custom';
interface DateRange { preset: Preset; from: string; to: string }
const PRESETS: { key: Preset; label: string }[] = [
  { key: 'today', label: 'Today' },
  { key: '7', label: 'Last 7 days' },
  { key: '30', label: 'Last 30 days' },
  { key: '90', label: 'Last 90 days' },
  { key: 'custom', label: 'Custom range' },
];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function rangeOf(r: DateRange): [string, string] {
  const t = new Date();
  const ago = (n: number) => { const d = new Date(t); d.setDate(d.getDate() - n); return iso(d); };
  switch (r.preset) {
    case 'today': return [iso(t), iso(t)];
    case '7': return [ago(6), iso(t)];
    case '30': return [ago(29), iso(t)];
    case '90': return [ago(89), iso(t)];
    default: return [r.from, r.to];
  }
}
const fmtUS = (isoDate: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(isoDate); return m ? `${m[2]}/${m[3]}/${m[1]}` : ''; };
const dateLabel = (r: DateRange) =>
  r.preset !== 'custom' ? PRESETS.find((p) => p.key === r.preset)!.label
    : !r.from && !r.to ? 'Custom range' : `${fmtUS(r.from) || '…'} – ${fmtUS(r.to) || '…'}`;

export function AdminActionLog() {
  const navigate = useNavigate();
  const { log, orgs } = useStore();
  const [q, setQ] = useState('');
  const [barOpen, setBarOpen] = useState(false);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [draft, setDraft] = useState<Filters | null>(null);
  // The log covers the last 90 days by default.
  const [range, setRange] = useState<DateRange>({ preset: '90', from: '', to: '' });
  const [asc, setAsc] = useState(false);
  const [viewing, setViewing] = useState<LogEntry | null>(null);

  const d = draft ?? applied;
  const draftN = d.org.length + d.user.length + d.area.length + d.type.length;
  const appliedN = applied.org.length + applied.user.length + applied.area.length + applied.type.length;

  const options = useMemo(() => {
    const users = Array.from(new Set(log.map((l) => l.user))).sort();
    const orgKeys = new Map<string, string>();
    log.forEach((l) => orgKeys.set(l.orgNum || 'all', l.orgName || 'All organizations'));
    return {
      user: users.map((u) => ({ value: u, label: u })),
      org: Array.from(orgKeys).sort((a, b) => a[1].localeCompare(b[1])).map(([v, label]) => ({ value: v, label, meta: v === 'all' ? undefined : v })),
      area: LOG_AREAS.map((a) => ({ value: a, label: a })),
      type: LOG_TYPES.map((t) => ({ value: t, label: t })),
    };
  }, [log]);

  const [from, to] = rangeOf(range);
  const inRange = (l: LogEntry) => { const dt = logISODate(l.at); return !(from && dt < from) && !(to && dt > to); };
  const totalInRange = log.filter(inRange).length;
  const lq = q.trim().toLowerCase();
  const rows = log
    .filter((l) => {
      if (lq && ![l.user, l.orgName || 'All organizations', l.orgNum, l.type, l.field].some((x) => x.toLowerCase().includes(lq))) return false;
      if (applied.user.length && !applied.user.includes(l.user)) return false;
      if (applied.org.length && !applied.org.includes(l.orgNum || 'all')) return false;
      if (applied.area.length && !applied.area.includes(l.area)) return false;
      if (applied.type.length && !applied.type.includes(l.type)) return false;
      return inRange(l);
    })
    .sort((a, b) => (asc ? 1 : -1) * (logTime(a.at) - logTime(b.at)));

  const clearAll = () => { setApplied(EMPTY); setDraft(null); setQ(''); };
  const orgByNum = (num: string) => orgs.find((o) => String(o.num) === num);

  return (
    <>
      <div className={styles.sectionHead}>
        <div className={styles.sectionText}>
          <h2 className={styles.sectionTitle}>Action log</h2>
          <p className={styles.sectionDesc}>
            Changes saved in Admin › Countries and on each organization’s Settings tab: who made them, when, and what changed. Changes made anywhere else aren’t recorded here. Read-only.
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarGroup}>
            <h3 className={styles.cardTitle}>All changes</h3>
            <span className="cc-badge cc-badge--brand" aria-live="polite" aria-atomic="true">
              {rows.length !== totalInRange ? `${rows.length} of ` : ''}{totalInRange} {totalInRange === 1 ? 'change' : 'changes'}
            </span>
          </div>
          <div className={styles.toolbarGroup} style={{ gap: 'var(--space-2_5)' }}>
            <SearchField value={q} onChange={setQ} width={300} placeholder="Search by user, organization or field" aria-label="Search the action log by user, organization name or ID" clearable />
            <button type="button" className="cc-btn cc-btn--secondary cc-filter-toggle" aria-expanded={barOpen} aria-controls="alog-fbar" onClick={() => { setBarOpen((o) => !o); setDraft(null); }}>
              <ListFilter size={18} aria-hidden="true" />Filter
              {appliedN > 0 && !barOpen && <span className={styles.filterCount}>{appliedN}</span>}
            </button>
            <DateRangeMenu value={range} onChange={setRange} />
          </div>
        </div>

        <div id="alog-fbar" className="cc-filter-bar" hidden={!barOpen}>
          <div className="cc-filter-bar__filters">
            <FilterDropdown id="al-org" label="Organization" options={options.org} selected={d.org} onChange={(v) => setDraft({ ...d, org: v })} width={360} />
            <FilterDropdown id="al-user" label="User" options={options.user} selected={d.user} onChange={(v) => setDraft({ ...d, user: v })} />
            <FilterDropdown id="al-area" label="Area" options={options.area} selected={d.area} onChange={(v) => setDraft({ ...d, area: v })} searchable={false} />
            <FilterDropdown id="al-type" label="Change type" options={options.type} selected={d.type} onChange={(v) => setDraft({ ...d, type: v })} width={280} />
          </div>
          <div className="cc-filter-bar__actions" hidden={!(draftN || appliedN)}>
            <button type="button" className="cc-link cc-link-btn" onClick={() => { setApplied(EMPTY); setDraft(null); }}>Clear all</button>
            <button type="button" className="cc-btn cc-btn--secondary cc-btn--sm" onClick={() => { setApplied(d); setDraft(null); }}>Apply filters</button>
          </div>
        </div>

        <CCTable
          label="Action log"
          minWidth="1550px"
          empty={rows.length === 0}
          emptyIcon={Search}
          featuredIcon
          emptyTitle="No changes found"
          emptyText="Try changing your search, filters or date range."
          actionLabel={lq || appliedN ? 'Clear search and filters' : undefined}
          onAction={clearAll}
        >
          <thead>
            <tr>
              <th className={`${styles.pin1} ${styles.sortTh}`} style={{ width: 200, minWidth: 200 }} aria-sort={asc ? 'ascending' : 'descending'}>
                <button type="button" className={styles.sortBtn} style={{ paddingLeft: 'var(--space-4)' }} onClick={() => setAsc((a) => !a)}>
                  Date/Time{asc ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />}
                </button>
              </th>
              <th>Organization</th>
              <th style={{ width: 150 }}>User</th>
              <th style={{ width: 160 }}>Area</th>
              <th style={{ width: 170 }}>Change type</th>
              <th style={{ width: 200 }}>Field</th>
              <th style={{ width: 170 }}>Previous value</th>
              <th style={{ width: 170 }}>New value</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => {
              const o = l.orgNum ? orgByNum(l.orgNum) : undefined;
              const long = isLongValue(l);
              const viewBtn = (
                <button type="button" className={`cc-link cc-link-btn ${styles.viewText}`} onClick={() => setViewing(l)} aria-label={`View previous and new ${l.field}`}>
                  <FileText size={16} aria-hidden="true" />View text
                </button>
              );
              return (
                <tr key={l.id} className={styles.logRow}>
                  <td className={styles.pin1} style={{ paddingLeft: 'var(--space-4)', color: 'var(--gray-600)', fontVariantNumeric: 'tabular-nums' }}>{l.at}</td>
                  <td>
                    {l.orgNum && <span className={styles.orgNum}>{l.orgNum}</span>}
                    {o ? (
                      <a className="cc-link" href={`/organizations/${o.num}`} onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey) return; e.preventDefault(); navigate(`/organizations/${o.num}`); }}>{l.orgName}</a>
                    ) : (
                      <span style={{ color: 'var(--gray-900)' }}>{l.orgName || 'All organizations'}</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--gray-900)', fontWeight: 'var(--fw-medium)' }}>{l.user}</td>
                  <td>{l.area}</td>
                  <td>{l.type}</td>
                  <td title={l.field}>{l.field}</td>
                  <td title={long ? undefined : l.prev}>{long ? (l.prev ? viewBtn : '—') : l.prev || '—'}</td>
                  <td title={long ? undefined : l.next} style={{ color: 'var(--gray-900)', fontWeight: 'var(--fw-medium)' }}>{long ? viewBtn : l.next || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </CCTable>
      </div>

      {viewing && (
        <Dialog
          title={viewing.field}
          description={`${viewing.orgName || 'All organizations'} · ${viewing.user} · ${viewing.at}`}
          onClose={() => setViewing(null)}
          maxWidth={640}
          actions={<button type="button" className="cc-btn cc-btn--secondary" onClick={() => setViewing(null)}>Close</button>}
        >
          <div style={{ marginTop: 'var(--space-5)', display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div>
              <div className="cc-label">Previous value</div>
              <div className={styles.valueBox} style={{ border: '1px solid var(--gray-200)', background: 'var(--gray-50)', color: 'var(--gray-700)' }}>{viewing.prev || '—'}</div>
            </div>
            <div>
              <div className="cc-label">New value</div>
              <div className={styles.valueBox} style={{ border: '1px solid var(--blue-200)', background: 'var(--blue-25)', color: 'var(--gray-900)' }}>{viewing.next || '—'}</div>
            </div>
          </div>
        </Dialog>
      )}
    </>
  );
}

/* Toolbar dropdown: the button shows the current range; radio rows pick a preset; Custom range shows From and To. */
function DateRangeMenu({ value, onChange }: { value: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, wrap, close, btn);
  const label = dateLabel(value);

  return (
    <div className="cc-dropdown" ref={wrap}>
      <button ref={btn} type="button" className="cc-btn cc-btn--secondary" aria-haspopup="true" aria-expanded={open} aria-label={`Date range: ${label}`} onClick={() => setOpen((o) => !o)}>
        {label}<ChevronDown size={16} className="cc-dropdown__chevron" aria-hidden="true" />
      </button>
      {open && (
        <div className={`cc-dropdown__menu cc-dropdown__menu--end ${styles.dateMenu}`} role="group" aria-label="Date range" style={{ width: value.preset === 'custom' ? 260 : 200 }}>
          <fieldset className="cc-dropdown__group">
            <legend className="sr-only">Date range</legend>
            {PRESETS.map((p) => (
              <label key={p.key} className="cc-dropdown__option">
                <input className="cc-radio__input" type="radio" name="al-date-preset" checked={value.preset === p.key}
                  onChange={() => { onChange({ ...value, preset: p.key }); if (p.key !== 'custom') setOpen(false); }} />
                <span className="cc-dropdown__label">{p.label}</span>
              </label>
            ))}
          </fieldset>
          {value.preset === 'custom' && (
            <div className={styles.custom}>
              <label className="cc-field">
                <span className="cc-label">From</span>
                <input type="date" className="cc-input" value={value.from} max={value.to || undefined} onChange={(e) => onChange({ ...value, from: e.target.value })} />
              </label>
              <label className="cc-field">
                <span className="cc-label">To</span>
                <input type="date" className="cc-input" value={value.to} min={value.from || undefined} onChange={(e) => onChange({ ...value, to: e.target.value })} />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
