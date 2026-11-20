/* Admin › Countries: which countries students can ship paper orders to. Edit, then save; each change is
   written to the Action log. */

import { forwardRef, useImperativeHandle, useState } from 'react';
import { ArrowDown, ArrowUp, Check, Minus, Search } from 'lucide-react';
import { CURRENT_USER, useStore, type Country } from '../data/store';
import { logEntry, stampNow } from '../data/actionLog';
import { CCTable } from '../components/CCTable';
import { SearchField } from '../components/SearchField';
import { SegTabs } from '../components/SegTabs';
import { useToast } from '../components/Toast';
import styles from './Admin.module.css';

export interface CountriesHandle {
  dirty: () => boolean;
  save: () => void;
  discard: () => void;
}

type SortKey = 'name' | 'code' | 'on';
type Show = 'all' | 'on' | 'off';

export const AdminCountries = forwardRef<CountriesHandle>(function AdminCountries(_, ref) {
  const { countries: saved, setCountries, addLog } = useStore();
  const toast = useToast();
  const [draft, setDraft] = useState<Country[] | null>(null);
  const [q, setQ] = useState('');
  const [show, setShow] = useState<Show>('all');
  // Default order (A to Z by country) shows no arrow; the arrow appears once someone sorts.
  const [sort, setSort] = useState<{ k: SortKey; d: 'asc' | 'desc' } | null>(null);

  const editing = draft !== null;
  const list = draft ?? saved;
  const changed = list.filter((c, i) => saved[i] && c.on !== saved[i].on);

  const save = () => {
    if (!draft) return;
    if (!changed.length) { setDraft(null); toast('No changes to save', 'Countries are unchanged.'); return; }
    const now = stampNow();
    setCountries(draft.map((c) => ({ ...c })));
    addLog(changed.map((c) => logEntry(now, CURRENT_USER.name, '', '', 'Countries', `Shipping: ${c.name} (${c.code})`, c.on ? 'Disabled' : 'Enabled', c.on ? 'Enabled' : 'Disabled')));
    setDraft(null);
    toast('Successfully updated countries', `${changed.length} ${changed.length === 1 ? 'country was' : 'countries were'} updated.`);
  };
  useImperativeHandle(ref, () => ({ dirty: () => changed.length > 0, save, discard: () => setDraft(null) }));

  const qn = q.trim().toLowerCase();
  let rows = list
    .map((c, i) => ({ c, i }))
    .filter(({ c, i }) => (!qn || c.name.toLowerCase().includes(qn) || c.code.toLowerCase().includes(qn)) && (show === 'all' || saved[i].on === (show === 'on')));
  const s = sort ?? { k: 'name' as SortKey, d: 'asc' as const };
  rows = rows.slice().sort((a, b) => {
    const A = s.k === 'code' ? a.c.code : s.k === 'on' ? String(a.c.on) : a.c.name;
    const B = s.k === 'code' ? b.c.code : s.k === 'on' ? String(b.c.on) : b.c.name;
    return (A < B ? -1 : A > B ? 1 : 0) * (s.d === 'desc' ? -1 : 1);
  });

  const onSort = (k: SortKey) => setSort((cur) => (!cur || cur.k !== k ? { k, d: 'asc' } : cur.d === 'asc' ? { k, d: 'desc' } : null));
  const sortTh = (k: SortKey, label: string, width?: number) => {
    const on = sort?.k === k;
    return (
      <th className={styles.sortTh} style={{ width }} aria-sort={on ? (sort!.d === 'asc' ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className={styles.sortBtn} style={k === 'name' ? { paddingLeft: 'var(--space-4)' } : undefined} onClick={() => onSort(k)}>
          {label}
          {on && (sort!.d === 'asc' ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />)}
        </button>
      </th>
    );
  };

  const toggle = (i: number, on: boolean) => setDraft((d) => (d ?? saved).map((c, j) => (j === i ? { ...c, on } : c)));
  const enabledN = saved.filter((c) => c.on).length;

  return (
    <>
      <div className={styles.sectionHead}>
        <div className={styles.sectionText}>
          <h2 className={styles.sectionTitle}>Countries</h2>
          <p className={styles.sectionDesc}>
            Applies to every organization. Students can only ship paper orders to enabled countries in the Credential Connections Store. The United States and its territories ship domestically and aren’t listed.
          </p>
        </div>
        <div className={styles.sectionActions}>
          {editing ? (
            <>
              <button type="button" className="cc-btn cc-btn--secondary" onClick={() => setDraft(null)}>Cancel</button>
              <button type="button" className="cc-btn cc-btn--primary" aria-disabled={!changed.length} onClick={save}>Save changes</button>
            </>
          ) : (
            <button type="button" className="cc-btn cc-btn--primary" onClick={() => setDraft(saved.map((c) => ({ ...c })))}>Edit</button>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.toolbarGroup} role="group" aria-label="Show countries">
            <SegTabs
              inset
              tabs={[
                { key: 'all', label: 'All', count: saved.length },
                { key: 'on', label: 'Enabled', count: enabledN },
                { key: 'off', label: 'Disabled', count: saved.length - enabledN },
              ]}
              value={show}
              onChange={setShow}
            />
            <span role="status" aria-live="polite" className={styles.found}>
              {qn ? `${rows.length} ${rows.length === 1 ? 'country' : 'countries'} found` : ''}
            </span>
          </div>
          <SearchField value={q} onChange={setQ} width={300} placeholder="Search by country or code" aria-label="Search countries by name or code" clearable />
        </div>

        <CCTable
          label="Countries"
          minWidth="640px"
          empty={rows.length === 0}
          emptyIcon={Search}
          featuredIcon
          emptyTitle="No countries found"
          emptyText="Your search did not match any countries. Try a different name or code, or clear your search."
          actionLabel="Clear search"
          onAction={() => { setQ(''); setShow('all'); }}
        >
          <thead>
            <tr>
              {sortTh('name', 'Country')}
              {sortTh('code', 'Code', 140)}
              {sortTh('on', 'Shipping', 260)}
            </tr>
          </thead>
          <tbody>
            {rows.map(({ c, i }) => {
              const unsaved = saved[i] && saved[i].on !== c.on;
              return (
                // Codes aren't unique in the source list (two places share SH), so key by position.
                <tr key={i} className={styles.countryRow} data-off={!c.on}>
                  <td className={styles.countryName} style={{ paddingLeft: 'var(--space-4)', color: c.on ? 'var(--gray-900)' : 'var(--gray-600)' }}>
                    {c.name}
                    {unsaved && <span className="cc-badge cc-badge--warning" style={{ marginLeft: 'var(--space-2)' }}>Unsaved</span>}
                  </td>
                  <td style={{ color: 'var(--gray-600)' }}>{c.code}</td>
                  <td>
                    {editing ? (
                      <label className="cc-checkbox" style={{ color: c.on ? 'var(--success-700)' : 'var(--gray-600)' }}>
                        <input type="checkbox" className="cc-checkbox__input" checked={c.on} onChange={(e) => toggle(i, e.target.checked)} aria-label={`Enabled for shipping: ${c.name}`} />
                        {c.on ? 'Enabled' : 'Disabled'}
                      </label>
                    ) : (
                      <span className={`cc-badge cc-badge--square${c.on ? ' cc-badge--success' : ''}`}>
                        {c.on ? <Check size={12} aria-hidden="true" /> : <Minus size={12} aria-hidden="true" />}
                        {c.on ? 'Enabled' : 'Disabled'}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </CCTable>
      </div>
    </>
  );
});
