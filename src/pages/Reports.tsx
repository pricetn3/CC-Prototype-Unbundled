/* Reports: Paper Credentials (DirectShip Tracking), Digital Credentials (Downloads, Validations, Issued vs Downloaded)
   and Student Reorders. Detail reports search by criteria; summary reports list months in a date range with a total row. */

import { useState } from 'react';
import { ArrowDown, ArrowUp, ChevronDown, Filter, Plus, SearchX, Upload, X } from 'lucide-react';
import { SegTabs } from '../components/SegTabs';
import { SearchField } from '../components/SearchField';
import { FilterDropdown } from '../components/FilterDropdown';
import { UsersOrgPicker } from '../components/UsersOrgPicker';
import { useToast } from '../components/Toast';
import {
  MONTHS, REPORT_ORGS, downloadCsv, downloadRows, monthlyRows, rangeError, trackRows,
  type MonthRow, type ReorderStatus, type ReportRow, type SummaryKind,
} from '../data/reports';
import styles from './Reports.module.css';

type Tab = 'paper' | 'digital' | 'reorders';
type Sub = 'track' | 'downloads' | 'validations' | 'ivd' | 'reorders';
interface Crit { key: string; val: string; from: string; to: string }
interface SortSt { key: string; dir: 1 | -1 }
type Facets = Record<string, string[]>;
interface Col { key: string; label: string; num?: boolean; tip?: string }

const BLANK: Crit = { key: '', val: '', from: '', to: '' };
const CRIT_DEFS: Record<'track' | 'downloads', [string, string, 'text' | 'range'][]> = {
  track: [['so', 'SO Number', 'text'], ['tracking', 'Tracking', 'text'], ['order', 'Order Date', 'range'], ['conf', 'Conferral Date', 'range'], ['name', 'Name', 'text'], ['ind', 'Individual ID', 'text'], ['email', 'Email', 'text']],
  downloads: [['so', 'SO Number', 'text'], ['dl', 'Download Date', 'range'], ['conf', 'Conferral Date', 'range'], ['order', 'Order Date', 'range'], ['name', 'Name', 'text'], ['ind', 'Individual ID', 'text'], ['email', 'Email', 'text']],
};
const DETAIL_COLS: Record<'track' | 'downloads', Col[]> = {
  track: [
    { key: 'tracking', label: 'Tracking' }, { key: 'so', label: 'SO Number' }, { key: 'ship', label: 'Ship Date' }, { key: 'carrier', label: 'Carrier' },
    { key: 'name', label: 'Name' }, { key: 'ind', label: 'Individual ID' }, { key: 'email', label: 'Email' }, { key: 'a1', label: 'Address 1' },
    { key: 'a2', label: 'Address 2' }, { key: 'a3', label: 'Address 3' }, { key: 'city', label: 'City' }, { key: 'state', label: 'State' },
    { key: 'zip', label: 'Zip code' }, { key: 'country', label: 'Country' },
  ],
  downloads: [
    { key: 'dl', label: 'Download Date' }, { key: 'so', label: 'SO Number' }, { key: 'purchase', label: 'Purchase Date' }, { key: 'conf', label: 'Conferral Date' },
    { key: 'order', label: 'Order Date' }, { key: 'name', label: 'Name' }, { key: 'ind', label: 'Individual ID' }, { key: 'email', label: 'Email' }, { key: 'credential', label: 'Credential' },
  ],
};
const DETAIL_FILTERS: Record<'track' | 'downloads', [string, string][]> = {
  track: [['so', 'SO Number'], ['tracking', 'Tracking'], ['carrier', 'Carrier'], ['name', 'Name'], ['ind', 'Individual ID']],
  downloads: [['so', 'SO Number'], ['name', 'Name'], ['ind', 'Individual ID'], ['credential', 'Credential']],
};
const SUMMARY_COLS: Record<SummaryKind, Col[]> = {
  validations: [{ key: 'year', label: 'Year' }, { key: 'month', label: 'Month' }, { key: 'validations', label: 'Validations', num: true }],
  ivd: [{ key: 'year', label: 'Year' }, { key: 'month', label: 'Month' }, { key: 'issued', label: 'Issued', num: true }, { key: 'downloaded', label: 'Downloaded', num: true }, { key: 'uptake', label: 'Uptake %', num: true }],
  reorders: [{ key: 'year', label: 'Year' }, { key: 'month', label: 'Month' }, { key: 'orders', label: 'Orders Received', num: true }, { key: 'gross', label: 'Gross Total', num: true }, { key: 'fee', label: 'Paradigm Fee', num: true, tip: '$1.95 per order' }, { key: 'net', label: 'Net Total', num: true }],
};
const DATE_KEYS = ['ship', 'dl', 'purchase', 'conf', 'order'];
const money = (n: number) => (n < 0 ? '$-' : '$') + Math.abs(n).toFixed(2);
const pct = (n: number) => (n * 100).toFixed(2) + '%';
const fmtISO = (iso: string) => { const p = iso.split('-'); return `${p[1]}/${p[2]}/${p[0]}`; };

export function Reports() {
  const toast = useToast();
  const [tab, setTab] = useState<Tab>('paper');
  const [digitalSub, setDigitalSub] = useState<'downloads' | 'validations' | 'ivd'>('downloads');
  const [org, setOrg] = useState('');
  const [crit, setCrit] = useState<Partial<Record<Sub, Crit[]>>>({});
  const [applied, setApplied] = useState<Partial<Record<Sub, Crit[] | null>>>({});
  const [collapsed, setCollapsed] = useState<Partial<Record<Sub, boolean>>>({});
  const [sorts, setSorts] = useState<Partial<Record<Sub, SortSt>>>({});
  const [ranges, setRanges] = useState<Partial<Record<Sub, { from: string; to: string }>>>({});
  const [facets, setFacets] = useState<Partial<Record<Sub, Facets>>>({});
  const [draft, setDraft] = useState<Facets | null>(null);
  const [fbOpen, setFbOpen] = useState(false);
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<ReorderStatus>('approved');

  const sub: Sub = tab === 'paper' ? 'track' : tab === 'reorders' ? 'reorders' : digitalSub;
  const isDetail = sub === 'track' || sub === 'downloads';
  const heading = { paper: 'Paper Credential Reports', digital: 'Digital Credential Reports', reorders: 'Student Reorder Report' }[tab];
  const resetView = () => { setQ(''); setFbOpen(false); setDraft(null); };

  const appliedF = facets[sub] ?? {};
  const d = draft ?? appliedF;
  const nApplied = Object.values(appliedF).reduce((n, a) => n + a.length, 0);

  // Sorting
  const sortSt = sorts[sub] ?? (isDetail ? { key: sub === 'track' ? 'ship' : 'dl', dir: 1 as const } : null);
  const onSort = (key: string) => {
    const on = sortSt?.key === key;
    setSorts({ ...sorts, [sub]: { key, dir: on ? (-sortSt!.dir as 1 | -1) : 1 } });
  };

  let cols: Col[] = [];
  let cells: { v: string; cls?: string }[][] = [];
  let total: string[] | null = null;
  let countText = '';
  let csvName = '';
  let filterDefs: { id: string; label: string; options: string[]; width?: number }[] = [];

  /* ----- detail ----- */
  const critDefs = isDetail ? CRIT_DEFS[sub as 'track' | 'downloads'] : [];
  const crits = crit[sub] ?? [BLANK];
  const kind = (k: string) => critDefs.find((c) => c[0] === k)?.[2] ?? 'text';
  const labelOf = (k: string) => critDefs.find((c) => c[0] === k)?.[1] ?? '';
  const complete = (c: Crit) => !!c.key && (kind(c.key) === 'range' ? !!(c.from && c.to && !rangeError(c.from, c.to)) : !!c.val.trim());
  const anyErr = crits.some((c) => c.key && kind(c.key) === 'range' && rangeError(c.from, c.to));
  const ready = crits.some(complete) && !anyErr;
  const app = applied[sub] ?? null;
  const isCollapsed = !!collapsed[sub];
  const setCrits = (list: Crit[]) => setCrit({ ...crit, [sub]: list });
  const doSearch = () => {
    if (!ready) return;
    setApplied({ ...applied, [sub]: crits.filter(complete).map((c) => ({ ...c })) });
    setCollapsed({ ...collapsed, [sub]: true });
    setQ('');
  };

  if (org && isDetail) {
    const dsub = sub as 'track' | 'downloads';
    const base: ReportRow[] = dsub === 'track' ? trackRows(org) : downloadRows(org);
    const dateIn = (s: string, c: Crit) => { const t = Date.parse(s); return t >= Date.parse(c.from) && t <= Date.parse(c.to) + 864e5 - 1; };
    let rows = !app ? [] : base.filter((r) => app.every((c) => (kind(c.key) === 'range' ? dateIn(r[c.key], c) : String(r[c.key] ?? '').toLowerCase().includes(c.val.trim().toLowerCase()))));
    filterDefs = DETAIL_FILTERS[dsub].map(([id, label]) => ({ id, label, width: id === 'credential' ? 300 : 240, options: Array.from(new Set(rows.map((r) => r[id]))).sort() }));
    rows = rows.filter((r) => DETAIL_FILTERS[dsub].every(([id]) => !(appliedF[id] ?? []).length || appliedF[id].includes(r[id])));
    const lq = q.trim().toLowerCase();
    if (lq) rows = rows.filter((r) => Object.values(r).some((v) => v.toLowerCase().includes(lq)));
    cols = DETAIL_COLS[dsub];
    if (sortSt) {
      const f = (r: ReportRow) => (DATE_KEYS.includes(sortSt.key) ? Date.parse(r[sortSt.key]) || 0 : r[sortSt.key] ?? '');
      rows = rows.slice().sort((a, b) => { const x = f(a), y = f(b); return (x < y ? -1 : x > y ? 1 : 0) * sortSt.dir; });
    }
    cells = rows.map((r) => cols.map((c, i) => ({ v: r[c.key] ?? '', cls: i === 0 ? styles.first : undefined })));
    countText = dsub === 'track' ? `${rows.length} ${rows.length === 1 ? 'credential found' : 'credentials found'}` : `${rows.length} ${rows.length === 1 ? 'total download' : 'total downloads'}`;
    csvName = (dsub === 'track' ? 'directship-tracking' : 'digital-downloads') + '-' + org;
  }

  /* ----- summary ----- */
  const rg = ranges[sub] ?? { from: '2024-05-16', to: '2025-12-15' };
  const rgErr = rangeError(rg.from, rg.to);
  const dateWord = sub === 'validations' ? 'Validation' : sub === 'ivd' ? 'Conferral' : 'Order';
  if (org && !isDetail) {
    const skind = sub as SummaryKind;
    let rows: MonthRow[] = [];
    if (!rgErr && rg.from && rg.to) { const a = Date.parse(rg.from), b = Date.parse(rg.to); rows = monthlyRows(skind, org, status).filter((r) => r.start <= b && r.end >= a); }
    filterDefs = [
      { id: 'year', label: 'Year', width: 180, options: Array.from(new Set(rows.map((r) => String(r.year)))).sort().reverse() },
      { id: 'month', label: 'Month', width: 200, options: MONTHS.filter((m) => rows.some((r) => r.monthName === m)) },
    ];
    rows = rows.filter((r) => (!(appliedF.year ?? []).length || appliedF.year.includes(String(r.year))) && (!(appliedF.month ?? []).length || appliedF.month.includes(r.monthName)));
    cols = SUMMARY_COLS[skind];
    if (sortSt) {
      const f = (r: MonthRow) => (sortSt.key === 'month' ? r.month : (r[sortSt.key as keyof MonthRow] as number) ?? 0);
      rows = rows.slice().sort((a, b) => { const x = f(a), y = f(b); return (x < y ? -1 : x > y ? 1 : 0) * sortSt.dir; });
    } else rows = rows.slice().sort((a, b) => b.year - a.year || a.month - b.month);
    cells = rows.map((r) => cols.map((c, i) => {
      if (c.key === 'month') return { v: r.monthName };
      if (c.key === 'year') return { v: String(r.year), cls: i === 0 ? styles.first : undefined };
      if (c.key === 'uptake') return { v: pct(r.uptake ?? 0), cls: `${styles.num} ${styles.mid}` };
      if (c.key === 'gross' || c.key === 'fee') { const n = r[c.key] ?? 0; return { v: n ? money(n) : '$0', cls: styles.num }; }
      if (c.key === 'net') { const n = r.net ?? 0; return { v: n ? money(n) : '$0', cls: `${styles.num} ${styles.strong} ${n < 0 ? styles.neg : ''}` }; }
      return { v: String(r[c.key as keyof MonthRow] ?? ''), cls: styles.num };
    }));
    const sum = (k: keyof MonthRow) => rows.reduce((n, r) => n + ((r[k] as number) || 0), 0);
    if (rows.length) {
      if (skind === 'validations') total = ['Total Validations', '', String(sum('validations'))];
      if (skind === 'ivd') { const iss = sum('issued'), dl = sum('downloaded'); total = ['Total', '', String(iss), String(dl), pct(iss ? dl / iss : 0)]; }
      if (skind === 'reorders') total = ['Total', '', String(sum('orders')), money(sum('gross')), money(sum('fee')), money(Math.round(sum('net') * 100) / 100)];
    }
    countText = `${rows.length} ${rows.length === 1 ? 'result' : 'results'}`;
    csvName = ({ validations: 'digital-validations', ivd: 'issued-vs-downloaded', reorders: 'student-reorders-' + status } as Record<SummaryKind, string>)[skind] + '-' + org;
  }

  const onExport = () => {
    if (!cells.length) { toast('Nothing to export', 'There are no rows in this report.'); return; }
    downloadCsv(csvName, cols.map((c) => c.label), cells.map((r) => r.map((x) => x.v)).concat(total ? [total] : []));
    toast('Export started', `${cells.length} ${cells.length === 1 ? 'row' : 'rows'} will download as ${csvName}.csv.`);
  };

  const filterButton = (
    <button type="button" className="cc-btn cc-btn--secondary" aria-expanded={fbOpen} aria-controls="rp-filterbar" onClick={() => { setFbOpen((o) => !o); setDraft(null); }}>
      <Filter size={16} aria-hidden="true" />Filter
      {nApplied > 0 && <span className={styles.filterCount}>{nApplied}</span>}
    </button>
  );
  const exportButton = <button type="button" className="cc-btn cc-btn--primary" onClick={onExport}><Upload size={16} aria-hidden="true" />Export</button>;
  const filterBar = fbOpen && (
    <div id="rp-filterbar" role="group" aria-label="Filters" className={`${styles.filterBar} ${isDetail ? '' : styles.filterBarBare}`}>
      {filterDefs.map((f) => (
        <FilterDropdown key={f.id} id={`rp-f-${f.id}`} label={f.label} width={f.width} options={f.options.map((v) => ({ value: v, label: v }))}
          selected={d[f.id] ?? []} onChange={(v) => setDraft({ ...d, [f.id]: v })} />
      ))}
      <div className={styles.filterEnd}>
        <button type="button" className="cc-link cc-link-btn" onClick={() => { setFacets({ ...facets, [sub]: {} }); setDraft(null); }}>Clear all</button>
        <button type="button" className="cc-btn cc-btn--secondary cc-btn--sm" onClick={() => { setFacets({ ...facets, [sub]: d }); setDraft(null); }}>Apply filters</button>
      </div>
    </div>
  );
  const table = (
    <>
      <div className={`cc-scr ${styles.tableWrap}`} tabIndex={0} role="region" aria-label={`${heading} results`}>
        <table className={styles.table} style={{ minWidth: isDetail ? (sub === 'track' ? 1760 : 1240) : 720 }}>
          <thead>
            <tr>
              {cols.map((c) => {
                const on = sortSt?.key === c.key;
                return (
                  <th key={c.key} className={on ? styles.thOn : undefined} style={{ textAlign: c.num ? 'right' : 'left' }} aria-sort={on ? (sortSt!.dir === 1 ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" className={`${styles.sortBtn} ${c.num ? styles.sortBtnNum : ''} ${on ? styles.sortOn : ''}`} title={c.tip} onClick={() => onSort(c.key)}>
                      {c.label}
                      {on && (sortSt!.dir === 1 ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />)}
                    </button>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {cells.map((r, i) => (
              <tr key={i}>{r.map((x, j) => <td key={j} className={x.cls}>{x.v}</td>)}</tr>
            ))}
            {total && (
              <tr className={styles.total}>{total.map((v, j) => <td key={j} className={cols[j]?.num ? styles.num : undefined}>{v}</td>)}</tr>
            )}
          </tbody>
        </table>
      </div>
      {cells.length === 0 && (
        <div className={styles.empty}>
          <SearchX size={32} className={styles.emptyIcon} aria-hidden="true" />
          <div className={styles.emptyTitle}>{isDetail ? 'No results found' : 'No data for this range'}</div>
          <div className={styles.emptyText}>{isDetail ? 'Try different search criteria or clear your filters.' : 'Try a wider date range or clear your filters.'}</div>
        </div>
      )}
    </>
  );

  const subTabs: [Sub, string][] = tab === 'paper' ? [['track', 'DirectShip Tracking']] : [['downloads', 'Downloads'], ['validations', 'Validations'], ['ivd', 'Issued vs Downloaded']];

  return (
    <>
      <div className={`cc-scr ${styles.top}`}>
        <h1 className={styles.title}>Reports</h1>
        <div className={styles.tabs}>
          <SegTabs<Tab> label="Report category" value={tab} onChange={(t) => { setTab(t); resetView(); }}
            tabs={[{ key: 'paper', label: 'Paper Credentials' }, { key: 'digital', label: 'Digital Credentials' }, { key: 'reorders', label: 'Student Reorders' }]} />
        </div>
      </div>

      <div className={styles.body}>
        <div className={styles.headRow}>
          <h2 className={styles.h2}>{heading}</h2>
          <UsersOrgPicker id="op-rp" width={396} options={REPORT_ORGS.map((o) => ({ key: o.num, ...o }))} value={org}
            onChange={(v) => { setOrg(v); setApplied({}); setQ(''); }} />
        </div>

        {tab !== 'reorders' && (
          <div className="cc-utabs" role="tablist" aria-label="Report type">
            {subTabs.map(([k, label]) => (
              <button key={k} type="button" role="tab" aria-selected={sub === k} className="cc-utabs__tab"
                onClick={() => { if (k !== 'track') setDigitalSub(k as 'downloads' | 'validations' | 'ivd'); resetView(); }}>{label}</button>
            ))}
          </div>
        )}

        {!org && <p className={styles.noOrg}>Select an organization to enter search criteria.</p>}

        {org && isDetail && (
          <>
            <div className={styles.card}>
              <div className={`${styles.critHead} ${!isCollapsed ? styles.critHeadOpen : ''}`} onClick={() => setCollapsed({ ...collapsed, [sub]: !isCollapsed })}>
                <button type="button" className={styles.critToggle} aria-expanded={!isCollapsed} onClick={(e) => { e.stopPropagation(); setCollapsed({ ...collapsed, [sub]: !isCollapsed }); }}>Search Criteria</button>
                <div className={styles.chips}>
                  {(app ?? []).map((c, i) => (
                    <span key={c.key} className={styles.chip}>
                      <span className={styles.chipLabel}>{labelOf(c.key)}:</span>
                      {kind(c.key) === 'range' ? `${fmtISO(c.from)}-${fmtISO(c.to)}` : c.val.trim()}
                      <button type="button" className="cc-icon-btn cc-icon-btn--xs" aria-label={`Remove ${labelOf(c.key)} criteria`}
                        onClick={(e) => {
                          e.stopPropagation();
                          const rest = app!.filter((_, j) => j !== i);
                          const left = crits.filter((x) => !(x.key === c.key && x.val === c.val && x.from === c.from && x.to === c.to));
                          setApplied({ ...applied, [sub]: rest.length ? rest : null });
                          setCrits(left.length ? left : [BLANK]);
                          setCollapsed({ ...collapsed, [sub]: rest.length > 0 });
                        }}>
                        <X size={12} aria-hidden="true" />
                      </button>
                    </span>
                  ))}
                </div>
                <ChevronDown size={16} aria-hidden="true" className={`${styles.chev} ${!isCollapsed ? styles.chevOpen : ''}`} />
              </div>
              {!isCollapsed && (
                <div className={styles.critBody}>
                  {crits.map((c, i) => {
                    const k = kind(c.key);
                    const err = k === 'range' ? rangeError(c.from, c.to) : '';
                    const lab = labelOf(c.key) || 'criteria';
                    const upd = (patch: Partial<Crit>) => setCrits(crits.map((x, j) => (j === i ? { ...x, ...patch } : x)));
                    const selId = `rp-crit-${sub}-${i}`;
                    return (
                      <div key={i} className={styles.critRow}>
                        <div className={styles.critSel}>
                          <label htmlFor={selId} className="sr-only">Search criteria</label>
                          <select id={selId} className={`cc-input ${styles.select}`} value={c.key} onChange={(e) => upd({ key: e.target.value, val: '', from: '', to: '' })}>
                            <option value="">Select criteria</option>
                            {critDefs.map(([key, label, t]) => (
                              <option key={key} value={key} disabled={key !== c.key && crits.some((x) => x.key === key)}>{label + (t === 'range' ? '  (2 year range)' : '')}</option>
                            ))}
                          </select>
                          <ChevronDown size={16} className={styles.selChev} aria-hidden="true" />
                        </div>
                        <div className={styles.critVal}>
                          {k !== 'range' ? (
                            <input className="cc-input" value={c.val} disabled={!c.key} aria-label={lab} placeholder={c.key ? `Enter ${lab.toLowerCase()}` : 'Enter search criteria'}
                              onChange={(e) => upd({ val: e.target.value })} onKeyDown={(e) => { if (e.key === 'Enter') doSearch(); }} />
                          ) : (
                            <>
                              <div className={styles.range}>
                                <input type="date" className="cc-input" value={c.from} aria-label={`${lab} start`} aria-invalid={err ? true : undefined} onChange={(e) => upd({ from: e.target.value })} />
                                <span aria-hidden="true" className={styles.dash}>–</span>
                                <input type="date" className="cc-input" value={c.to} aria-label={`${lab} end`} aria-invalid={err ? true : undefined} onChange={(e) => upd({ to: e.target.value })} />
                              </div>
                              {err && <p role="alert" className={styles.err}>{err}</p>}
                            </>
                          )}
                        </div>
                        <button type="button" className="cc-icon-btn" aria-label="Remove criteria" onClick={() => setCrits(crits.length > 1 ? crits.filter((_, j) => j !== i) : [BLANK])}>
                          <X size={20} aria-hidden="true" />
                        </button>
                      </div>
                    );
                  })}
                  {crits.length < critDefs.length && (
                    <button type="button" className={`cc-link cc-link-btn ${styles.addBtn}`} onClick={() => setCrits(crits.concat([{ ...BLANK }]))}><Plus size={16} aria-hidden="true" />Add criteria</button>
                  )}
                  <div><button type="button" className="cc-btn cc-btn--primary cc-btn--sm" aria-disabled={!ready} onClick={doSearch}>Search</button></div>
                </div>
              )}
            </div>

            {app && (
              <div className={`${styles.card} ${styles.clip}`}>
                <div className={styles.resHead}>
                  <span role="status" className="cc-badge cc-badge--brand">{countText}</span>
                  <div className={styles.tools}>
                    <SearchField value={q} onChange={setQ} width={280} placeholder="Search" aria-label="Search results" clearable />
                    {filterButton}
                    {exportButton}
                  </div>
                </div>
                {filterBar}
                <div className={styles.tableTop}>{table}</div>
              </div>
            )}
          </>
        )}

        {org && !isDetail && (
          <>
            {tab === 'digital' && <h3 className={styles.h3}>{sub === 'validations' ? 'Validations' : 'Issued vs Downloaded'}</h3>}
            <div className={styles.summaryBar}>
              <div className={styles.dates}>
                <div>
                  <label htmlFor="rp-from" className={styles.label}>{dateWord} date (start)</label>
                  <input id="rp-from" type="date" className={`cc-input ${styles.dateInput}`} value={rg.from} aria-invalid={rgErr ? true : undefined} aria-describedby={rgErr ? 'rp-range-err' : undefined}
                    onChange={(e) => setRanges({ ...ranges, [sub]: { ...rg, from: e.target.value } })} />
                </div>
                <div>
                  <label htmlFor="rp-to" className={styles.label}>{dateWord} date (end)</label>
                  <input id="rp-to" type="date" className={`cc-input ${styles.dateInput}`} value={rg.to} aria-invalid={rgErr ? true : undefined} aria-describedby={rgErr ? 'rp-range-err' : undefined}
                    onChange={(e) => setRanges({ ...ranges, [sub]: { ...rg, to: e.target.value } })} />
                </div>
                <span role="status" className={`cc-badge cc-badge--brand ${styles.countBadge}`}>{countText}</span>
              </div>
              <div className={styles.tools}>
                {sub === 'reorders' && (
                  <div className={styles.statusSel}>
                    <label htmlFor="rp-status" className="sr-only">Reorder status</label>
                    <select id="rp-status" className={`cc-input ${styles.select}`} value={status} onChange={(e) => setStatus(e.target.value as ReorderStatus)}>
                      <option value="approved">Approved</option>
                      <option value="denied">Denied</option>
                      <option value="all">All statuses</option>
                    </select>
                    <ChevronDown size={16} className={styles.selChev} aria-hidden="true" />
                  </div>
                )}
                {filterButton}
                {exportButton}
              </div>
            </div>
            {rgErr && <p id="rp-range-err" role="alert" className={styles.err} style={{ marginTop: 'calc(-1 * var(--space-1))' }}>{rgErr}</p>}
            {filterBar}
            <div className={`${styles.card} ${styles.clip}`}>{table}</div>
          </>
        )}
      </div>
    </>
  );
}
