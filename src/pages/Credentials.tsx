/* Orders › Credentials: Paper / Digital tabs, an organization picker and a search-criteria card that
   collapses into removable badges once a search runs. Results open a credential side panel.
   Query params (optional): tab=paper|digital, so=<SO number>, org=<org name>, order=<order id> (back link to Orders). */

import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  AlertCircle, ArrowDown, ArrowUp, Box, Calendar, Check, ChevronDown, ChevronRight, ChevronsUpDown, Clock, Copy, Download,
  ExternalLink, GraduationCap, ListFilter, Plus, RefreshCw, Search, Send, Share, Truck, X,
} from 'lucide-react';
import { CURRENT_USER, useStore } from '../data/store';
import { CREDENTIALS, CRED_DEFS, credStamp, type Credential, type CredTab, type CritKey } from '../data/credentials';
import { SegTabs } from '../components/SegTabs';
import { SearchField } from '../components/SearchField';
import { CCTable } from '../components/CCTable';
import { Drawer } from '../components/Drawer';
import { Dialog } from '../components/Dialog';
import { FilterDropdown } from '../components/FilterDropdown';
import { OrdersMenu } from '../components/OrdersMenu';
import { useToast } from '../components/Toast';
import styles from './Credentials.module.css';

interface Crit { key: CritKey | ''; val: string; from?: string; to?: string }
interface Applied { crits: { key: CritKey; val: string }[] }
interface Crumb { label: string; cur: string; back: { orderId?: string; credId?: string; kind?: CredTab } }
interface Panel { id: string; kind: CredTab; tab: 'credential' | 'auth' | 'student' }

const BLANK: Crit[] = [{ key: '', val: '' }];
const yr = (d: string) => +((/(\d{4})/.exec(d) || [0, 0])[1]);
const rangeErr = (c: Crit) => {
  const f = (c.from || '').trim(), t = (c.to || '').trim();
  if (!/^\d{4}$/.test(f) || !/^\d{4}$/.test(t)) return 'Enter both years as 4 digits, like 2024 and 2025.';
  if (+t < +f) return 'To year must be the same as or after From year.';
  if (+t - +f > 1) return 'Choose a range of 2 years or less.';
  return '';
};
const cv = (c: Crit) => (c.key === 'date' ? (c.from || '').trim() || (c.to || '').trim() : c.val.trim());
const critOk = (r: Credential, c: { key: CritKey; val: string }) => {
  if (c.key === 'date') { const p = c.val.split('-'); return yr(r.date) >= +p[0] && yr(r.date) <= +p[1]; }
  return String(r[c.key] || '').toLowerCase().includes(c.val.trim().toLowerCase());
};
const fVal = (r: Credential, k: string) => (k === 'status' ? (r.invalid ? 'Invalid' : 'Valid') : String((r as unknown as Record<string, unknown>)[k] || ''));

function ValidBadge({ invalid }: { invalid: boolean }) {
  return invalid
    ? <span className="cc-badge cc-badge--error"><X size={12} aria-hidden="true" />Invalid</span>
    : <span className="cc-badge cc-badge--success"><Check size={12} aria-hidden="true" />Valid</span>;
}

export function Credentials() {
  const { orgs } = useStore();
  const toast = useToast();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const titleRef = useRef<HTMLHeadingElement>(null);

  const [tab, setTab] = useState<CredTab>('paper');
  const [orgId, setOrgId] = useState<string>(() => (orgs.find((o) => o.id === 'org-1800') ?? orgs[0])?.id ?? '');
  const [crit, setCrit] = useState<Record<CredTab, Crit[]>>({ paper: BLANK, digital: BLANK });
  const [critErr, setCritErr] = useState<Record<number, string>>({});
  const [applied, setApplied] = useState<Record<CredTab, Applied | null>>({ paper: null, digital: null });
  const [collapsed, setCollapsed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [tq, setTq] = useState('');
  const [barOpen, setBarOpen] = useState(false);
  const [fDraft, setFDraft] = useState<Record<string, string[]> | null>(null);
  const [fApplied, setFApplied] = useState<Record<CredTab, Record<string, string[]>>>({ paper: {}, digital: {} });
  const [sort, setSort] = useState<Record<CredTab, 'asc' | 'desc' | null>>({ paper: null, digital: null });
  const [patches, setPatches] = useState<Record<string, Partial<Credential>>>({});
  const [panel, setPanel] = useState<Panel | null>(null);
  const [crumb, setCrumb] = useState<Crumb | null>(null);
  const [sel, setSel] = useState<Record<string, true> | null>(null);
  const [bulk, setBulk] = useState<{ kind: 'valid' | 'invalid'; ids: string[]; ok: boolean; at: string } | null>(null);
  const [send, setSend] = useState<{ id: string; email: string; tried: boolean } | null>(null);
  const [confirm, setConfirm] = useState<{ title: string; msg: string; label: string; danger: boolean; action: () => void } | null>(null);
  const busyT = useRef<number | null>(null);
  useEffect(() => () => { if (busyT.current) window.clearTimeout(busyT.current); }, []);

  const all = useMemo(() => CREDENTIALS.map((c) => (patches[c.id] ? { ...c, ...patches[c.id] } : c)), [patches]);
  const patch = (id: string, p: Partial<Credential>) => setPatches((x) => ({ ...x, [id]: { ...x[id], ...p } }));

  // Programmatic search: "View order credentials" / "Credentials found" / arriving from the Orders panel.
  const go = (t: CredTab, key: CritKey, val: string, c: Crumb | null) => {
    setTab(t);
    setCrit((x) => ({ ...x, [t]: [{ key, val }] }));
    setApplied((x) => ({ ...x, [t]: { crits: [{ key, val }] } }));
    setCollapsed(true); setTq(''); setPanel(null); setSel(null); setCrumb(c);
    window.setTimeout(() => titleRef.current?.focus(), 60);
  };
  useEffect(() => {
    const so = params.get('so');
    if (!so) return;
    const t = params.get('tab') === 'digital' ? 'digital' : 'paper';
    const orgName = params.get('org');
    const o = orgName ? orgs.find((x) => x.name === orgName) : undefined;
    if (o) setOrgId(o.id);
    const orderId = params.get('order');
    go(t, 'so', so, orderId ? { label: 'Order ' + so, cur: 'View order credentials', back: { orderId } } : null);
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const defs = CRED_DEFS[tab];
  const isDig = tab === 'digital';
  const label = isDig ? 'digital' : 'paper';
  const org = orgs.find((o) => o.id === orgId) ?? orgs[0];
  const crits = crit[tab];
  const setCrits = (fn: (a: Crit[]) => Crit[]) => setCrit((x) => ({ ...x, [tab]: fn(x[tab].map((c) => ({ ...c }))) }));
  const ready = crits.some((c) => c.key && cv(c));
  const ap = applied[tab];
  const crError = !!ap && ap.crits.some((c) => c.val.trim().toLowerCase() === 'error');

  let results: Credential[] = [];
  if (ap && !crError) {
    results = all.filter((r) => (isDig ? r.digital : r.paper) && ap.crits.every((c) => critOk(r, c)));
    const q = tq.trim().toLowerCase();
    if (q) results = results.filter((r) => [r.name, r.ind, r.so, r.school, r.credential, r.major, r.date, r.cedid].some((x) => x.toLowerCase().includes(q)));
  }
  const preFilter = results;
  const fa = fApplied[tab];
  results = results.filter((r) => defs.facets.every(([k]) => !(fa[k] || []).length || fa[k].includes(fVal(r, k))));
  const s = sort[tab];
  if (s) results = results.slice().sort((a, b) => ((Date.parse(a.date) || 0) - (Date.parse(b.date) || 0)) * (s === 'desc' ? -1 : 1));
  const fd = fDraft ?? fa;
  const appliedN = defs.facets.reduce((n, [k]) => n + (fa[k] || []).length, 0);
  const draftN = defs.facets.reduce((n, [k]) => n + (fd[k] || []).length, 0);

  const resetSearch = () => {
    setApplied((x) => ({ ...x, [tab]: null })); setCrit((x) => ({ ...x, [tab]: BLANK }));
    setTq(''); setCollapsed(false); setPanel(null); setCrumb(null); setSel(null);
  };
  const doSearchNow = () => {
    const ce: Record<number, string> = {};
    crits.forEach((c, i) => { if (c.key === 'date' && cv(c)) { const m = rangeErr(c); if (m) ce[i] = m; } });
    setCritErr(ce);
    if (Object.keys(ce).length) { setCollapsed(false); return; }
    const list = crits.filter((c) => c.key && cv(c)).map((c) => ({ key: c.key as CritKey, val: c.key === 'date' ? `${c.from}-${c.to}` : c.val.trim() }));
    setApplied((x) => ({ ...x, [tab]: { crits: list } }));
    setCollapsed(true); setTq(''); setPanel(null); setCrumb(null);
  };
  const doSearch = () => {
    if (!ready || busy) return;
    setBusy(true);
    busyT.current = window.setTimeout(() => { setBusy(false); doSearchNow(); }, 450);
  };
  const removeChip = (i: number) => {
    if (!ap) return;
    const left = ap.crits.filter((_, j) => j !== i);
    if (!left.length) { resetSearch(); return; }
    setApplied((x) => ({ ...x, [tab]: { crits: left } }));
    setCrit((x) => ({ ...x, [tab]: left.map((c) => (c.key === 'date' ? { key: c.key, val: '', from: c.val.split('-')[0], to: c.val.split('-')[1] } : { ...c })) }));
    setCrumb(null);
  };
  const critLabel = (k: string) => (defs.crit.find((d) => d[0] === k)?.[1] ?? k).replace(' (2 year range)', '');

  const selOn = isDig && sel !== null;
  const selIds = selOn ? Object.keys(sel!).filter((id) => results.some((r) => r.id === id)) : [];
  const allSel = results.length > 0 && selIds.length === results.length;
  const toggleSel = (id: string) => setSel((x) => { const n = { ...(x || {}) }; if (n[id]) delete n[id]; else n[id] = true; return n; });

  const openPanel = (id: string, kind: CredTab = tab, ptab: Panel['tab'] = 'credential') => setPanel({ id, kind, tab: ptab });
  const onRowOpen = (r: Credential) => { if (selOn) { toggleSel(r.id); return; } openPanel(r.id); };

  const switchTab = (t: CredTab) => { setTab(t); setPanel(null); setFDraft(null); setBarOpen(false); setCritErr({}); };

  const pr = panel ? all.find((r) => r.id === panel.id) ?? null : null;

  return (
    <>
      <div className={`cc-scr ${styles.head}`}>
        {crumb && (
          <nav aria-label="Breadcrumb" className={styles.crumbs}>
            <button type="button" className="cc-icon-btn cc-icon-btn--xs" aria-label="Credentials" onClick={() => setCrumb(null)}><Box size={16} aria-hidden="true" /></button>
            <ChevronRight size={16} aria-hidden="true" />
            <button
              type="button"
              className="cc-link cc-link-btn"
              onClick={() => {
                if (crumb.back.orderId) { navigate(`/orders?order=${encodeURIComponent(crumb.back.orderId)}`); return; }
                if (crumb.back.credId) openPanel(crumb.back.credId, crumb.back.kind);
              }}
            >{crumb.label}</button>
            <ChevronRight size={16} aria-hidden="true" />
            <span aria-current="page" className={styles.crumbCur}>{crumb.cur}</span>
          </nav>
        )}
        <h1 ref={titleRef} tabIndex={-1} className={styles.title}>Credentials</h1>
      </div>

      <div className={styles.body}>
        <div>
          <SegTabs label="Credential type" tabs={[{ key: 'paper', label: 'Paper' }, { key: 'digital', label: 'Digital' }]} value={tab} onChange={switchTab} />
        </div>

        <div className={styles.intro}>
          <div>
            <h2 className={styles.h2}>{isDig ? 'Digital credentials' : 'Paper credentials'}</h2>
            <p className={styles.desc}>Select an organization and input search criteria to view credentials.</p>
          </div>
          {org && (
            <OrdersMenu
              id="cr-org"
              ariaLabel={`Organization: ${org.num} ${org.name}`}
              buttonClassName={`cc-btn cc-btn--secondary ${styles.orgBtn}`}
              buttonLabel={<span><span className={styles.orgNum}>{org.num}</span>{org.name}</span>}
              options={orgs.map((o) => ({ value: o.id, label: o.name, meta: String(o.num) }))}
              value={orgId}
              onChange={(id) => { setOrgId(id); setApplied({ paper: null, digital: null }); setPanel(null); setCrumb(null); setCollapsed(false); }}
              menuWidth={400}
              align="end"
              searchPlaceholder="Search by ID or name"
              emptyText="No organizations match that search."
            />
          )}
        </div>

        <div className={styles.card}>
          <div className={styles.critHead}>
            <button type="button" className={styles.critToggle} aria-expanded={!collapsed} aria-controls="cr-crit" onClick={() => setCollapsed((c) => !c)}>
              Search criteria
            </button>
            {ap && (
              <div className={styles.chips}>
                {ap.crits.map((c, i) => (
                  <span key={c.key} className={styles.chip}>
                    <span className={styles.chipKey}>{critLabel(c.key)}:</span>{c.val}
                    <button type="button" className="cc-icon-btn cc-icon-btn--xs" aria-label={`Remove filter ${critLabel(c.key)}: ${c.val}`} onClick={() => removeChip(i)}><X size={14} aria-hidden="true" /></button>
                  </span>
                ))}
              </div>
            )}
            <button type="button" className="cc-icon-btn cc-icon-btn--xs" aria-label={collapsed ? 'Expand search criteria' : 'Collapse search criteria'} aria-expanded={!collapsed} aria-controls="cr-crit" onClick={() => setCollapsed((c) => !c)}>
              <ChevronDown size={18} aria-hidden="true" className={`${styles.chev} ${collapsed ? '' : styles.chevUp}`} />
            </button>
          </div>
          {!collapsed && (
            <div id="cr-crit" className={styles.critBody}>
              {crits.map((c, i) => (
                <div key={i} className={styles.critRow}>
                  <div className={styles.selWrap}>
                    <select
                      className="cc-input"
                      aria-label="Search criteria"
                      value={c.key}
                      onChange={(e) => { const v = e.target.value as CritKey | ''; setCrits((a) => { a[i].key = v; return a; }); }}
                    >
                      <option value="">Select criteria</option>
                      {defs.crit.map(([k, l]) => <option key={k} value={k} disabled={k !== c.key && crits.some((x) => x.key === k)}>{l}</option>)}
                    </select>
                  </div>
                  {c.key === 'date' ? (
                    <div className={styles.range}>
                      <label className={styles.rangeLbl} htmlFor={`cr-from-${i}`}>From year</label>
                      <input id={`cr-from-${i}`} className="cc-input" inputMode="numeric" maxLength={4} placeholder="2024" value={c.from || ''} aria-invalid={!!critErr[i] || undefined} aria-describedby={critErr[i] ? `cr-err-${i}` : undefined}
                        onChange={(e) => { const v = e.target.value; setCrits((a) => { a[i].from = v; return a; }); }} onKeyDown={(e) => e.key === 'Enter' && doSearch()} />
                      <label className={styles.rangeLbl} htmlFor={`cr-to-${i}`}>To year</label>
                      <input id={`cr-to-${i}`} className="cc-input" inputMode="numeric" maxLength={4} placeholder="2025" value={c.to || ''} aria-invalid={!!critErr[i] || undefined} aria-describedby={critErr[i] ? `cr-err-${i}` : undefined}
                        onChange={(e) => { const v = e.target.value; setCrits((a) => { a[i].to = v; return a; }); }} onKeyDown={(e) => e.key === 'Enter' && doSearch()} />
                      {critErr[i] && <p id={`cr-err-${i}`} className={styles.err}>{critErr[i]}</p>}
                    </div>
                  ) : (
                    <div className={styles.valWrap}>
                      <input className="cc-input" placeholder="Enter search criteria" aria-label="Search criteria value" value={c.val}
                        onChange={(e) => { const v = e.target.value; setCrits((a) => { a[i].val = v; return a; }); }} onKeyDown={(e) => e.key === 'Enter' && doSearch()} />
                    </div>
                  )}
                  <button type="button" className={`cc-icon-btn cc-icon-btn--xs ${styles.removeBtn}`} aria-label="Remove criteria" onClick={() => setCrits((a) => { a.splice(i, 1); return a.length ? a : [{ key: '', val: '' }]; })}><X size={16} aria-hidden="true" /></button>
                </div>
              ))}
              <div className={styles.critFoot}>
                {crits.length < defs.crit.length ? (
                  <button type="button" className={`cc-link cc-link-btn ${styles.addBtn}`} onClick={() => setCrits((a) => a.concat([{ key: '', val: '' }]))}><Plus size={16} aria-hidden="true" />Add criteria</button>
                ) : <span />}
                <button type="button" className="cc-btn cc-btn--primary" disabled={!ready} aria-busy={busy} onClick={doSearch}>
                  {busy ? 'Searching' : <><Search size={16} aria-hidden="true" />Search</>}
                </button>
              </div>
            </div>
          )}
        </div>

        {ap && (
          <div className={`${styles.card} ${styles.results}`}>
            <div className={styles.toolbar}>
              <span className={styles.found} role="status" aria-live="polite">{results.length} {results.length === 1 ? 'credential found' : 'credentials found'}</span>
              <div className={styles.tools}>
                <SearchField value={tq} onChange={setTq} width={260} placeholder="Search" aria-label="Search within these results by name, ID, SO number, school or credential" title="Search within these results by name, ID, SO number, school or credential" clearable />
                <button type="button" className="cc-btn cc-btn--secondary" aria-expanded={barOpen} aria-controls="cr-fbar" onClick={() => { setBarOpen((o) => !o); setFDraft(null); }}>
                  <ListFilter size={16} aria-hidden="true" />Filter
                  {appliedN > 0 && !barOpen && <span className={styles.filterCount} aria-label={`${appliedN} applied`}>{appliedN}</span>}
                </button>
                {isDig && (
                  <button type="button" className="cc-btn cc-btn--primary" aria-disabled={selOn} onClick={() => { if (!selOn) { setSel({}); setPanel(null); } }}>Select</button>
                )}
                <button type="button" className="cc-btn cc-btn--secondary" aria-label="Export results" title="Export" onClick={() => toast('Export started', `${results.length} ${results.length === 1 ? 'credential' : 'credentials'} will download as a CSV file.`)}><Share size={16} aria-hidden="true" /></button>
              </div>
            </div>

            <div id="cr-fbar" className={`cc-filter-bar ${styles.filterBar}`} hidden={!barOpen}>
              <div className="cc-filter-bar__filters" style={{ alignItems: 'center' }}>
                {defs.facets.map(([k, l]) => {
                  let opts = Array.from(new Set(preFilter.map((r) => fVal(r, k)))).filter(Boolean);
                  opts = k === 'date' ? opts.sort((a, b) => (Date.parse(b) || 0) - (Date.parse(a) || 0)) : opts.sort();
                  return (
                    <FilterDropdown key={k} id={`crf-${k}`} label={l} options={opts.map((o) => ({ value: o, label: o }))} selected={fd[k] || []}
                      onChange={(v) => setFDraft({ ...fd, [k]: v })} />
                  );
                })}
              </div>
              <div className="cc-filter-bar__actions" hidden={!(appliedN || draftN)}>
                <button type="button" className="cc-link cc-link-btn" onClick={() => { setFApplied((x) => ({ ...x, [tab]: {} })); setFDraft(null); }}>Clear all</button>
                <button type="button" className="cc-btn cc-btn--secondary cc-btn--sm" onClick={() => { setFApplied((x) => ({ ...x, [tab]: { ...fd } })); setFDraft(null); }}>Apply filters</button>
              </div>
            </div>

            {crError ? (
              <div className={styles.state} role="alert">
                <span className={`${styles.stateIcon} ${styles.stateIconErr}`} aria-hidden="true"><AlertCircle size={24} /></span>
                <div className={styles.stateTitle}>Something went wrong...</div>
                <div className={styles.stateText}>We’re having trouble loading this data. Please refresh or contact support if the problem persists.</div>
                <button type="button" className="cc-btn cc-btn--secondary" onClick={resetSearch}><RefreshCw size={16} aria-hidden="true" />Refresh page</button>
              </div>
            ) : (
              <>
                <CCTable label={`${isDig ? 'Digital' : 'Paper'} credentials`} minWidth="960px">
                  <thead>
                    <tr>
                      {selOn && (
                        <th className={styles.checkCell}>
                          <input className="cc-checkbox__input" type="checkbox" aria-label="Select all credentials" checked={allSel}
                            ref={(el) => { if (el) el.indeterminate = selIds.length > 0 && !allSel; }}
                            onChange={(e) => { const ids: Record<string, true> = {}; if (e.target.checked) results.forEach((r) => { ids[r.id] = true; }); setSel(ids); }} />
                        </th>
                      )}
                      {defs.cols.map((c, i) => c === 'Conferral Date' ? (
                        <th key={c} aria-sort={s ? (s === 'asc' ? 'ascending' : 'descending') : 'none'} style={s ? { background: 'var(--gray-100)' } : undefined}>
                          <button type="button" className={styles.sortBtn} onClick={() => setSort((x) => ({ ...x, [tab]: !s ? 'desc' : s === 'desc' ? 'asc' : 'desc' }))}>
                            {c}{s === 'asc' ? <ArrowUp size={14} aria-hidden="true" /> : s === 'desc' ? <ArrowDown size={14} aria-hidden="true" /> : <ChevronsUpDown size={14} aria-hidden="true" />}
                          </button>
                        </th>
                      ) : <th key={c} className={i === 0 && !selOn ? styles.first : undefined}>{c}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((r) => (
                      <tr
                        key={r.id}
                        tabIndex={0}
                        className={`${styles.row} ${panel?.id === r.id ? styles.rowOpen : ''}`}
                        aria-label={`${r.name}, ${r.credential}. Open ${label} credential details`}
                        onClick={(e) => { if ((e.target as HTMLElement).closest('button, a, input, label')) return; onRowOpen(r); }}
                        onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(r.id); } }}
                      >
                        {selOn && (
                          <td className={styles.checkCell}>
                            <input className="cc-checkbox__input" type="checkbox" aria-label={`Select ${r.name}`} checked={!!sel?.[r.id]} onChange={() => toggleSel(r.id)} />
                          </td>
                        )}
                        <td className={selOn ? undefined : styles.first}>
                          <span className={`${styles.strong} ${styles.trunc}`} title={r.name}>{r.name}</span>
                          <span className={styles.muted}>{r.ind}</span>
                        </td>
                        {isDig && <td style={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{r.so}</td>}
                        <td><span className={styles.trunc} title={r.school}>{r.school}</span></td>
                        <td><span className={styles.trunc} title={r.credential}>{r.credential}</span></td>
                        {!isDig && <td><span className={styles.trunc} title={r.major}>{r.major}</span></td>}
                        <td style={{ whiteSpace: 'nowrap' }}>{r.date}</td>
                        {isDig && <td><ValidBadge invalid={r.invalid} /></td>}
                        {isDig && (
                          <td>
                            <button type="button" className="cc-btn cc-btn--secondary cc-btn--xs" aria-disabled={r.invalid} aria-label={`Send authorization link to ${r.name}`}
                              onClick={(e) => { e.stopPropagation(); if (!r.invalid) setSend({ id: r.id, email: r.email, tried: false }); }}>
                              <Send size={14} aria-hidden="true" />Send
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </CCTable>
                {results.length === 0 && (
                  <div className={styles.state}>
                    <span className={styles.stateIcon} aria-hidden="true"><Search size={24} /></span>
                    <div className={styles.stateTitle}>No credentials found!</div>
                    <div className={styles.stateText}>Your search did not match any {label} credentials. Please try again.</div>
                    <button type="button" className="cc-btn cc-btn--secondary cc-btn--sm" onClick={resetSearch}>Clear search</button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      {selOn && (
        <div className={styles.selBar} role="region" aria-label="Selected credentials">
          <button type="button" className="cc-link cc-link-btn" onClick={() => setSel(null)}>Cancel</button>
          <button type="button" className="cc-btn cc-btn--destructive-secondary" aria-disabled={!selIds.length} onClick={() => selIds.length && setBulk({ kind: 'invalid', ids: selIds, ok: false, at: '' })}>Mark invalid</button>
          <button type="button" className="cc-btn cc-btn--primary" aria-disabled={!selIds.length} onClick={() => selIds.length && setBulk({ kind: 'valid', ids: selIds, ok: false, at: '' })}>Mark valid</button>
          <span className={styles.selText} role="status">{selIds.length} selected</span>
        </div>
      )}

      {bulk && (() => {
        const inv = bulk.kind === 'invalid'; const n = bulk.ids.length;
        return (
          <Dialog
            title={inv ? 'Invalidate credentials' : 'Validate credentials'}
            description={inv ? 'Are you sure you want to rescind these credentials? They will be marked invalid.' : 'Are you sure you want to validate these credentials? They will be marked valid.'}
            onClose={() => setBulk(null)}
            actions={<>
              <button type="button" className="cc-btn cc-btn--secondary" onClick={() => setBulk(null)}>Cancel</button>
              <button type="button" className={`cc-btn ${inv ? 'cc-btn--destructive' : 'cc-btn--primary'}`} aria-disabled={!bulk.ok}
                onClick={() => {
                  if (!bulk.ok) return;
                  setPatches((x) => { const y = { ...x }; bulk.ids.forEach((id) => { y[id] = { ...y[id], invalid: inv }; }); return y; });
                  setBulk(null); setSel(null);
                  toast(inv ? 'Successfully invalidated credentials' : 'Successfully validated credentials', `The credentials selected have been marked ${inv ? 'invalid' : 'valid'}.`);
                }}>{inv ? 'Mark invalid' : 'Mark valid'}</button>
            </>}
          >
            <div className={styles.count}>Credentials selected:<span>{n}</span></div>
            <label className="cc-checkbox">
              <input className="cc-checkbox__input" type="checkbox" checked={bulk.ok} onChange={(e) => setBulk({ ...bulk, ok: e.target.checked, at: credStamp() })} />
              <span>
                I confirm {n} {n === 1 ? 'credential' : 'credentials'} will be {inv ? 'rescinded' : 'validated'}
                {bulk.ok && <span className={styles.confirmed}>Confirmed by {CURRENT_USER.name} on {bulk.at} EST</span>}
              </span>
            </label>
          </Dialog>
        );
      })()}

      {pr && panel && (
        <CredPanel
          key={pr.id + panel.kind}
          r={pr}
          panel={panel}
          orgName={org?.name ?? ''}
          found={all.filter((x) => x.ind === pr.ind && (panel.kind === 'digital' ? x.digital : x.paper)).length}
          setTab={(t) => setPanel({ ...panel, tab: t })}
          onClose={() => setPanel(null)}
          onFound={() => go(panel.kind, 'ind', pr.ind, { label: `${panel.kind === 'digital' ? 'Digital' : 'Paper'} credential: ${pr.so}`, cur: 'Individual ID credentials', back: { credId: pr.id, kind: panel.kind } })}
          onViewOrder={() => go(panel.kind, 'so', pr.so, { label: `${panel.kind === 'digital' ? 'Digital' : 'Paper'} credential: ${pr.so}`, cur: 'View order credentials', back: { credId: pr.id, kind: panel.kind } })}
          onCounter={() => setPanel({ id: pr.id, kind: panel.kind === 'digital' ? 'paper' : 'digital', tab: 'credential' })}
          onSend={() => setSend({ id: pr.id, email: pr.email, tried: false })}
          onDownload={() => setConfirm({
            title: 'Credential download', msg: 'This CeCredential download will be billed to the institution per your agreement, as it has not yet been purchased.', label: 'Download CeD', danger: false,
            action: () => { patch(pr.id, { lastDl: credStamp() }); toast('CeD downloaded', `${pr.name} — ${pr.cedid}.pdf`); },
          })}
          onPrimary={() => {
            if (panel.kind !== 'digital') { toast('Track order', `Opening carrier tracking for ${pr.tracking} is not available in this prototype.`); return; }
            if (pr.invalid) { patch(pr.id, { invalid: false }); toast('Successfully validated credential', 'The credential has been marked valid.'); return; }
            setConfirm({
              title: 'Invalidate credential', msg: 'Are you sure you want to rescind this credential? It will be marked invalid.', label: 'Mark invalid', danger: true,
              action: () => { patch(pr.id, { invalid: true }); toast('Successfully invalidated credential', 'The credential selected has been marked invalid.'); },
            });
          }}
        />
      )}

      {confirm && (
        <Dialog
          title={confirm.title}
          description={confirm.msg}
          role="alertdialog"
          onClose={() => setConfirm(null)}
          actions={<>
            <button type="button" className="cc-btn cc-btn--secondary" onClick={() => setConfirm(null)}>Cancel</button>
            <button type="button" className={`cc-btn ${confirm.danger ? 'cc-btn--destructive' : 'cc-btn--primary'}`} onClick={() => { const a = confirm.action; setConfirm(null); a(); }}>
              {!confirm.danger && <Download size={16} aria-hidden="true" />}{confirm.label}
            </button>
          </>}
        />
      )}

      {send && (() => {
        const sr = all.find((x) => x.id === send.id);
        if (!sr) return null;
        const okE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(send.email.trim());
        const showErr = send.tried && !okE;
        const code = String(100000 + (parseInt(sr.ind, 10) * 7919) % 900000);
        return (
          <Dialog
            title="Send credential link to student"
            description="This digital credential will be available to the student."
            onClose={() => setSend(null)}
            actions={<>
              <button type="button" className="cc-btn cc-btn--secondary" onClick={() => setSend(null)}>Cancel</button>
              <button type="button" className="cc-btn cc-btn--primary" onClick={() => {
                if (!okE) { setSend({ ...send, tried: true }); return; }
                patch(sr.id, { lastSent: credStamp(), email: send.email.trim(), sentBy: CURRENT_USER.name });
                setSend(null);
                toast('Successfully sent link to student', 'The link was sent to the student and they will have access to their digital credential.');
              }}><Send size={16} aria-hidden="true" />Send link</button>
            </>}
          >
            <div className="cc-alert cc-alert--warning" style={{ marginBottom: 'var(--space-4)' }}>
              <AlertCircle className="cc-alert__icon" aria-hidden="true" />
              <div className="cc-alert__body"><p className="cc-alert__message">Sending a link will give the student access to their digital credential.</p></div>
            </div>
            <div className="cc-field" style={{ marginBottom: 'var(--space-4)' }}>
              <label className="cc-label" htmlFor="crs-email">Student email</label>
              <input id="crs-email" type="email" className="cc-input" value={send.email} aria-invalid={showErr || undefined} aria-describedby={showErr ? 'crs-email-err' : undefined}
                onChange={(e) => setSend({ ...send, email: e.target.value })} />
              {showErr && <p id="crs-email-err" className="cc-hint cc-hint--error">Enter a valid email address.</p>}
            </div>
            <div className="cc-label">Two-factor authentication invitation code</div>
            <p className="cc-hint" style={{ marginBottom: 'var(--space-2)' }}>Provide this code to the student as a secondary method of authentication in a second email or by phone.</p>
            <div className={styles.code}>
              <span>{code}</span>
              <button type="button" className="cc-btn cc-btn--secondary cc-btn--sm" onClick={() => { void navigator.clipboard?.writeText(code).catch(() => {}); toast('Copied', 'Invitation code copied to clipboard.'); }}><Copy size={16} aria-hidden="true" />Copy</button>
            </div>
          </Dialog>
        );
      })()}
    </>
  );
}

function CredPanel({ r, panel, orgName, found, setTab, onClose, onFound, onViewOrder, onCounter, onSend, onDownload, onPrimary }: {
  r: Credential; panel: Panel; orgName: string; found: number; setTab: (t: Panel['tab']) => void; onClose: () => void;
  onFound: () => void; onViewOrder: () => void; onCounter: () => void; onSend: () => void; onDownload: () => void; onPrimary: () => void;
}) {
  const dig = panel.kind === 'digital';
  const inv = r.invalid;
  const tabs: [Panel['tab'], string][] = dig ? [['credential', 'Credential'], ['auth', 'Authorization']] : [['credential', 'Credential'], ['student', 'Student']];
  const hasCounter = dig ? r.paper : r.digital;
  const foundBtn = (
    <button type="button" className={`cc-link cc-link-btn ${styles.foundBtn}`} onClick={onFound}>
      <span className={styles.n}>{found}</span>Credentials found<ChevronRight size={16} aria-hidden="true" />
    </button>
  );

  return (
    <Drawer
      width={480}
      title={<span style={dig && inv ? { color: 'var(--error-700)' } : undefined}>{dig ? 'Digital credential' : 'Paper credential'} {r.so}</span>}
      subtitle={<>
        All details associated with this credential.
        <br />
        <button type="button" className={`cc-link cc-link-btn ${styles.pLink}`} onClick={onViewOrder}>View order credentials<ChevronRight size={16} aria-hidden="true" /></button>
      </>}
      onClose={onClose}
      footer={
        <div className={styles.footer}>
          {hasCounter ? <button type="button" className="cc-btn cc-btn--secondary" onClick={onCounter}>{dig ? 'View paper credential' : 'View digital credential'}</button> : <span />}
          <button type="button" className={`cc-btn ${dig && !inv ? 'cc-btn--destructive' : 'cc-btn--primary'}`} onClick={onPrimary}>
            {!dig && <ExternalLink size={16} aria-hidden="true" />}{dig ? (inv ? 'Mark valid' : 'Mark invalid') : 'Track order'}
          </button>
        </div>
      }
    >
      <div className={styles.pTabs} role="tablist" aria-label="Credential sections">
        {tabs.map(([k, l]) => (
          <button key={k} type="button" role="tab" id={`crp-tab-${k}`} aria-selected={panel.tab === k} aria-controls="crp-panel" className={styles.pTab} onClick={() => setTab(k)}>{l}</button>
        ))}
      </div>
      <div id="crp-panel" role="tabpanel" aria-labelledby={`crp-tab-${panel.tab}`}>
        {panel.tab === 'credential' && (
          <>
            {dig ? (
              <>
                <div className={styles.statusRow}><span className={styles.lbl}>Status</span><ValidBadge invalid={inv} /></div>
                <ul className={styles.ic}>
                  <li><Clock size={18} aria-hidden="true" />Ordered on {r.ordered}</li>
                  <li><GraduationCap size={18} aria-hidden="true" />Conferral date on {r.date}</li>
                  <li><Calendar size={18} aria-hidden="true" />Digital release on {r.release}</li>
                </ul>
              </>
            ) : (
              <>
                <h3 className={styles.lbl}>Details</h3>
                <ul className={styles.ic}>
                  <li><Clock size={18} aria-hidden="true" />Ordered on {r.ordered}</li>
                  <li><Truck size={18} aria-hidden="true" />Shipping by {r.ship}</li>
                  <li><GraduationCap size={18} aria-hidden="true" />Conferral date on {r.date}</li>
                </ul>
              </>
            )}
            <dl className={styles.grid}>
              <div><dt>Organization</dt><dd>{orgName}</dd></div>
              <div><dt>Name</dt><dd>{r.name}</dd></div>
              <div><dt>Individual ID</dt><dd>{r.ind}<br />{foundBtn}</dd></div>
              <div><dt>School Name</dt><dd>{r.school}</dd></div>
              <div><dt>Credential</dt><dd>{r.credential}</dd></div>
              {!dig && <div><dt>Major</dt><dd>{r.major}</dd></div>}
              {!dig && <div><dt>Tracking</dt><dd><a className="cc-link" href="#" onClick={(e) => { e.preventDefault(); onPrimary(); }}>{r.tracking}</a></dd></div>}
            </dl>
            {dig && (
              <div className={styles.block}>
                <div className={styles.lbl}>CeDiD</div>
                <div className={styles.mono}>{r.cedid}</div>
                <button type="button" className="cc-btn cc-btn--primary cc-btn--sm" aria-disabled={inv} onClick={() => { if (!inv) onDownload(); }}><Download size={16} aria-hidden="true" />Download CeD</button>
                <div className={styles.note}>{r.lastDl ? 'Last downloaded ' + r.lastDl : 'Not downloaded yet'}</div>
              </div>
            )}
          </>
        )}
        {panel.tab === 'auth' && (
          <>
            <div className={styles.block} style={{ marginTop: 0, paddingTop: 0, borderTop: 0, marginBottom: 'var(--space-6)' }}>
              <div className={styles.lbl}>Authorization link</div>
              <button type="button" className="cc-btn cc-btn--primary cc-btn--sm" aria-disabled={inv} onClick={() => { if (!inv) onSend(); }}><Send size={16} aria-hidden="true" />Send</button>
              <div className={styles.note}>{r.lastSent ? 'Last sent ' + r.lastSent : 'Not sent yet'}</div>
            </div>
            <dl className={styles.grid}>
              <div><dt>Sent to</dt><dd>{r.lastSent ? r.email : '—'}</dd></div>
              <div><dt>Sent by</dt><dd>{r.sentBy || '—'}</dd></div>
              <div><dt>Expiration date</dt><dd>{r.lastSent ? r.expires : '—'}</dd></div>
            </dl>
          </>
        )}
        {panel.tab === 'student' && (
          <>
            <dl className={styles.grid}>
              <div><dt>Individual ID</dt><dd>{r.ind}<br />{foundBtn}</dd></div>
              <div><dt>Phone</dt><dd>{r.phone}</dd></div>
              <div><dt>Email</dt><dd>{r.email}</dd></div>
            </dl>
            <div className={styles.block}>
              <div className={styles.lbl}>Shipping</div>
              <div className={styles.ship}><div>{r.ship1}</div><div>{r.ship2}</div><div>{r.ship3}</div></div>
            </div>
          </>
        )}
      </div>
    </Drawer>
  );
}
