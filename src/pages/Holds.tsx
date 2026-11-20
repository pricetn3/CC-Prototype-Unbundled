/* Orders › Hold Management: release, revert and delete held paper and digital records. In-memory state; resets on reload. */

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, ChevronsUpDown, Clock, Download, Eye, Filter, GraduationCap, HelpCircle, History,
  Info, Lock, MoreVertical, Package, Pencil, RotateCcw, SlidersHorizontal, Trash2, Upload, XCircle, AlertTriangle, Check,
} from 'lucide-react';
import { useStore } from '../data/store';
import type { ActivityItem } from '../data/reorders';
import { EXPIRING_EXPORTS, SERVICE_TYPES, holdSeedLog, seedHolds, type HoldRecord, type HoldStatus, type HoldType } from '../data/holds';
import { CCTable } from '../components/CCTable';
import { SearchField } from '../components/SearchField';
import { SegTabs } from '../components/SegTabs';
import { Dialog } from '../components/Dialog';
import { Drawer } from '../components/Drawer';
import { useToast } from '../components/Toast';
import {
  ActivityList, BulkBar, ChipFilterBar, ExportMenu, MenuItem, MenuSep, OrgPicker, PopMenu, countApplied, passes, type Applied, type ChipDef,
} from '../components/OrdersMgmtKit';
import s from './OrdersMgmt.module.css';

type Rec = HoldRecord & { addr1: string; addr2: string };
type SortKey = 'name' | 'cred' | 'conf' | 'ordered';
type Kind = 'release' | 'revert' | 'delete';
type EditVals = Record<string, string>;
const TB: Record<HoldType, { label: string; badge: string }> = { paper: { label: 'Paper', badge: '' }, digital: { label: 'Digital', badge: 'cc-badge--brand' } };
const TAB_WORD: Record<HoldStatus, string> = { hold: 'on hold', released: 'released', deleted: 'deleted' };
const CREDS = ['Associate of Arts', 'Bachelor of Arts', 'Bachelor of Science', 'Master of Arts', 'Master of Business Administration', 'Master of Science', 'Doctor of Philosophy'];
const EXP_COLS = ['Name', 'Individual ID', 'Type', 'Credential', 'Major', 'Conferral Date', 'Order Date'];

function validate(v: EditVals) {
  const err: Record<string, string> = {};
  if (!(v.diplomaName || '').trim()) err.diplomaName = 'Enter the name to print on the diploma.';
  if (!(v.major || '').trim()) err.major = 'Enter a major.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test((v.email || '').trim())) err.email = 'Enter a valid email address, like name@school.edu.';
  if (!(v.street || '').trim()) err.street = 'Enter a street address.';
  if (!(v.city || '').trim()) err.city = 'Enter a city.';
  return err;
}
const nowText = () => {
  const d = new Date();
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })} at ${d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })} ET`;
};

export function Holds() {
  const { orgs } = useStore();
  const toast = useToast();
  const [org, setOrg] = useState(orgs[0]?.id ?? '');
  const [edits, setEdits] = useState<Record<string, EditVals>>({});
  const [statusMap, setStatusMap] = useState<Record<string, HoldStatus>>({});
  const [logs, setLogs] = useState<Record<string, ActivityItem[]>>({});
  const [tab, setTab] = useState<HoldStatus>('hold');
  const [q, setQ] = useState('');
  const [view, setView] = useState<'all' | 'expiring'>('all');
  const [viewOpen, setViewOpen] = useState(false);
  const [fbOpen, setFbOpen] = useState(false);
  const [applied, setApplied] = useState<Applied>({});
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [pView, setPView] = useState<'credential' | 'student' | 'activity'>('credential');
  const [pMenu, setPMenu] = useState(false);
  const [edit, setEdit] = useState<{ id: string; v: EditVals; err: Record<string, string>; tried: boolean } | null>(null);
  const [dlg, setDlg] = useState<{ kind: Kind; ids: string[]; types: Record<HoldType, boolean>; service: string } | null>(null);
  const [allOpen, setAllOpen] = useState(false);
  const [allDraft, setAllDraft] = useState<Applied>({});
  const [expOpen, setExpOpen] = useState(false);
  const [pv, setPv] = useState<string | null>(null);

  const rows: Rec[] = useMemo(() => seedHolds().map((r) => {
    const x = { ...r, ...(edits[r.id] || {}) } as Rec;
    x.addr1 = x.street + (x.apt ? ', ' + x.apt : ''); x.addr2 = `${x.city}, ${x.state}, ${x.zip}, ${x.country}`;
    return x;
  }), [edits]);
  const statusOf = (r: HoldRecord, t: HoldType, m = statusMap) => m[`${r.id}:${t}`] || r.init[t] || 'hold';
  const isBatched = (r: HoldRecord, t: HoldType) => !statusMap[`${r.id}:${t}`] && !!r.batched[t] && statusOf(r, t) === 'released';
  const eligible = (kind: Kind, r: HoldRecord, t: HoldType) => (kind === 'revert' ? statusOf(r, t) === 'released' && !isBatched(r, t) : statusOf(r, t) === 'hold');
  const typesIn = (r: HoldRecord, st: HoldStatus) => r.types.filter((t) => statusOf(r, t) === st);

  const counts = { hold: 0, released: 0, deleted: 0 };
  rows.forEach((r) => r.types.forEach((t) => { counts[statusOf(r, t)]++; }));
  const holdExpN = rows.reduce((k, r) => k + (r.expSoon ? typesIn(r, 'hold').length : 0), 0);
  const inTab = rows.filter((r) => typesIn(r, tab).length);
  const confOpts: string[] = [];
  inTab.slice().sort((a, b) => (Date.parse(b.conferral) || 0) - (Date.parse(a.conferral) || 0)).forEach((r) => { if (!confOpts.includes(r.conferral)) confOpts.push(r.conferral); });
  const plain = (vals: string[]) => vals.map((v) => ({ value: v, label: v }));
  const names = [...new Set(inTab.map((r) => r.name))].sort();
  const creds = [...new Set(inTab.map((r) => r.credential))].sort();
  const defs: ChipDef[] = [
    { id: 'name', label: 'Name', kind: 'plain', options: plain(names) },
    { id: 'type', label: 'Type', kind: 'badge', width: 200, options: [{ value: 'paper', label: 'Paper' }, { value: 'digital', label: 'Digital', badge: 'cc-badge--brand' }] },
    { id: 'cred', label: 'Credential', kind: 'plain', width: 300, options: plain(creds) },
    { id: 'conf', label: 'Conferral Date', kind: 'plain', options: plain(confOpts) },
    { id: 'order', label: 'Order Date', kind: 'plain', options: plain(confOpts) },
  ];
  const hmView = tab === 'hold' ? view : 'all';
  const qn = q.trim().toLowerCase();
  const visible = rows.filter((r) => {
    const ts = typesIn(r, tab); if (!ts.length) return false;
    if ((applied.type || []).length && !ts.some((t) => applied.type.includes(t))) return false;
    if (!passes(applied, 'name', r.name) || !passes(applied, 'cred', r.credential) || !passes(applied, 'conf', r.conferral) || !passes(applied, 'order', r.ordered)) return false;
    if (hmView === 'expiring' && !r.expSoon) return false;
    return !qn || [r.name, r.indId, r.credential, r.major].join(' ').toLowerCase().includes(qn);
  });
  if (sort) {
    const kf: Record<SortKey, (r: HoldRecord) => string | number> = { name: (r) => r.name.toLowerCase(), cred: (r) => r.credential.toLowerCase(), conf: (r) => Date.parse(r.conferral) || 0, ordered: (r) => Date.parse(r.ordered) || 0 };
    visible.sort((a, b) => { const x = kf[sort.key](a), y = kf[sort.key](b); return (x < y ? -1 : x > y ? 1 : 0) * sort.dir; });
  }
  const selRows = visible.filter((r) => sel[r.id]); const selIds = selRows.map((r) => r.id);
  const selRecs = selRows.reduce((n, r) => n + typesIn(r, tab).length, 0);
  const found = visible.reduce((n, r) => n + typesIn(r, tab).length, 0);
  const nF = countApplied(applied);
  const isFiltered = !!qn || nF > 0;
  const revertableSel = selRows.filter((r) => r.types.some((t) => eligible('revert', r, t)));
  const batchedSel = selRows.filter((r) => typesIn(r, 'released').some((t) => isBatched(r, t))).length;
  const canBulkRevert = revertableSel.length > 0 && batchedSel === 0;

  const switchTab = (t: HoldStatus) => { setTab(t); setSel({}); setRowMenu(null); setOpenId(null); setEdit(null); setApplied({}); };
  const ask = (kind: Kind, ids: string[]) => { if (ids.length) { setDlg({ kind, ids, types: { paper: true, digital: true }, service: 'standard' }); setRowMenu(null); setPMenu(false); } };
  const addLog = (lg: Record<string, ActivityItem[]>, id: string, what: string) => { lg[id] = [{ who: 'Jordan A', ini: 'JA', what, when: nowText(), ago: 'Just now' }, ...(lg[id] || [])]; };
  const apply = (d: NonNullable<typeof dlg>) => {
    const map = { ...statusMap }; const lg = { ...logs };
    const to: HoldStatus = ({ release: 'released', revert: 'hold', delete: 'deleted' } as const)[d.kind];
    const verb = { release: 'Released hold', revert: 'Reverted hold', delete: 'Deleted records' }[d.kind];
    const recs = rows.filter((r) => d.ids.includes(r.id));
    let n = 0; const who: string[] = [];
    recs.forEach((r) => {
      const done = r.types.filter((t) => d.types[t] && eligible(d.kind, r, t));
      done.forEach((t) => { map[`${r.id}:${t}`] = to; n++; });
      if (done.length) { who.push(r.name); addLog(lg, r.id, verb + (done.length === r.types.length ? '' : ` (${done.join(', ')})`)); }
    });
    if (!n) return;
    if (openId) { const o = recs.find((r) => r.id === openId); if (o && !o.types.some((t) => statusOf(o, t, map) === tab)) setOpenId(null); }
    setStatusMap(map); setLogs(lg); setDlg(null); setSel({}); setEdit(null);
    const recText = `${n} ${n === 1 ? 'record' : 'records'}`;
    const whoText = who.length === 1 ? who[0] : `${who.length} learners`;
    if (d.kind === 'release') {
      const stillHeld = recs.some((r) => r.indId && rows.some((x) => x.indId === r.indId && x.types.some((t) => statusOf(x, t, map) === 'hold')));
      toast('Successfully released hold', 'The selected records have been released and are now available in the released tab.' + (stillHeld ? ' Additional records for this student are still on hold.' : ''));
    } else if (d.kind === 'revert') toast('Hold reverted', `${recText} for ${whoText} moved back to On Hold.`);
    else toast('Records deleted', `${recText} for ${whoText} moved to Deleted.`);
  };

  const openRow = (id: string, v: 'credential' | 'activity' = 'credential') => { setOpenId(id); setPView(v); setEdit(null); setRowMenu(null); setPMenu(false); };
  const startEdit = (r: Rec, v?: 'credential' | 'student') => {
    setEdit({ id: r.id, v: { diplomaName: r.diplomaName, credential: r.credential, major: r.major, phone: r.phone, email: r.email, comment: r.comment, street: r.street, apt: r.apt, city: r.city, state: r.state, zip: r.zip }, err: {}, tried: false });
    setPView(v ?? (pView === 'student' ? 'student' : 'credential')); setPMenu(false); setRowMenu(null);
  };
  const saveEdit = () => {
    if (!edit) return;
    const err = validate(edit.v);
    if (Object.keys(err).length) {
      setEdit({ ...edit, err, tried: true });
      setPView(Object.keys(err).some((k) => k === 'diplomaName' || k === 'major') ? 'credential' : 'student');
      setTimeout(() => document.getElementById('hm-ed-' + Object.keys(err)[0])?.focus(), 60);
      return;
    }
    setEdits({ ...edits, [edit.id]: { ...(edits[edit.id] || {}), ...edit.v } });
    const lg = { ...logs }; addLog(lg, edit.id, 'Edited record information'); setLogs(lg);
    setEdit(null);
    toast('Record updated', `Changes to ${rows.find((x) => x.id === edit.id)?.name || 'this record'} were saved.`);
  };

  const sortTh = (key: SortKey, label: string, extra?: React.ReactNode) => {
    const on = sort?.key === key;
    return (
      <th className={s.sortTh} aria-sort={on ? (sort!.dir === 1 ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className={s.sortBtn} onClick={() => setSort({ key, dir: on ? (-sort!.dir as 1 | -1) : 1 })}>
          {label}{extra}<ChevronsUpDown size={14} className={s.sortIcon} aria-hidden="true" />
        </button>
      </th>
    );
  };

  // Expiring exports
  const expRows = rows.filter((r) => r.expSoon && typesIn(r, 'hold').length);
  const cells = (r: HoldRecord) => [r.name, r.indId || 'ID Not Provided', typesIn(r, 'hold').map((t) => TB[t].label).join(' + '), r.credential, r.major, r.conferral, r.ordered];
  const download = (name: string) => {
    try {
      const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
      const csv = [EXP_COLS.join(','), ...expRows.map((r) => cells(r).map(esc).join(','))].join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
      const a = document.createElement('a'); a.href = url; a.download = name.replace(/[^A-Za-z0-9]+/g, '-') + '.csv';
      document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
    } catch { /* ignore */ }
    toast('Download started', `${name} is downloading.`);
  };
  const exps = org === orgs[0]?.id ? EXPIRING_EXPORTS : [];

  const open = rows.find((r) => r.id === openId) || null;
  const panelCloseRef = useRef<() => void>(() => {});
  panelCloseRef.current = () => { if (dlg) return; if (pMenu) setPMenu(false); else if (edit) setEdit(null); else setOpenId(null); };
  const onPanelClose = useCallback(() => panelCloseRef.current(), []);
  const closeDlg = useCallback(() => setDlg(null), []);
  const closeAll = useCallback(() => setAllOpen(false), []);
  const expCloseRef = useRef<() => void>(() => {});
  expCloseRef.current = () => { if (!pv) setExpOpen(false); };
  const closeExp = useCallback(() => expCloseRef.current(), []);
  const closePv = useCallback(() => setPv(null), []);

  return (
    <>
      <div className={`cc-scr ${s.header}`}>
        <div className={s.headText}>
          <h1 className={s.title}>Hold Management</h1>
          <p className={s.subtitle}>Records have been processed but not yet produced, and orders for released records are created based on your selected schedule. Paper and digital records may be released separately per learner.</p>
        </div>
        <div className={s.headActions}>
          <button type="button" className="cc-btn cc-btn--primary" onClick={() => setExpOpen(true)}><Clock size={16} aria-hidden="true" />Expiring record reports</button>
          <OrgPicker value={org} onChange={(v) => { setOrg(v); setSel({}); setOpenId(null); }} />
        </div>
      </div>

      <div className={s.body}>
        <div className={s.card}>
          <div className={s.toolbar}>
            <div className={s.toolGroup}>
              <SegTabs inset label="Hold status" value={tab} onChange={switchTab}
                tabs={[{ key: 'hold', label: 'On Hold', count: `${view === 'expiring' ? holdExpN : counts.hold} ${(view === 'expiring' ? holdExpN : counts.hold) === 1 ? 'record' : 'records'}` }, { key: 'released', label: 'Released' }, { key: 'deleted', label: 'Deleted' }]} />
              <span role="status" className={s.found}>{tab !== 'hold' || isFiltered ? `${found} ${found === 1 ? 'record' : 'records'} found` : ''}</span>
            </div>
            <div className={s.toolGroup}>
              <SearchField value={q} onChange={setQ} width={300} placeholder="Search" aria-label="Search hold records" clearable />
              {tab === 'hold' && (
                <PopMenu label="View" open={viewOpen} setOpen={setViewOpen}
                  trigger={(t) => <button {...t} type="button" className={`cc-btn cc-btn--secondary ${view === 'expiring' ? 'cc-filter-active' : ''}`} style={view === 'expiring' ? { borderColor: 'var(--blue-600)' } : undefined}><SlidersHorizontal size={16} aria-hidden="true" />View</button>}>
                  {([['all', 'All records', ''], ['expiring', 'Expiring soon', 'Within 60 days']] as const).map(([k, l, sub]) => (
                    <button key={k} type="button" role="menuitemradio" aria-checked={view === k} className="cc-dropdown__option" aria-selected={view === k}
                      onClick={() => { setView(k); setSel({}); }}>
                      <span className="cc-dropdown__label">{l}{sub && <span className={s.sub} style={{ marginLeft: 'var(--space-1_5)' }}>{sub}</span>}</span>
                      <Check className="cc-dropdown__check" aria-hidden="true" />
                    </button>
                  ))}
                </PopMenu>
              )}
              <button type="button" className="cc-btn cc-btn--secondary" aria-expanded={fbOpen} aria-controls="hm-filterbar" onClick={() => setFbOpen(!fbOpen)}>
                <Filter size={16} aria-hidden="true" />Filter{nF > 0 && <span className={s.filterCount}>{nF}<span className="sr-only"> applied</span></span>}
              </button>
              <ExportMenu label="Export hold records" selCount={selRecs}
                onAll={() => toast('Export started', `${found} ${TAB_WORD[tab]} records will download as a CSV file.`)}
                onSel={() => toast('Export started', `${selRecs} selected records will download as a CSV file.`)} />
            </div>
          </div>
          {fbOpen && (
            <ChipFilterBar key={`${tab}-${JSON.stringify(applied)}`} id="hm-filterbar" defs={defs} applied={applied} onApply={setApplied}
              extra={<button type="button" className="cc-btn cc-btn--tertiary cc-btn--sm" onClick={() => { setAllDraft(applied); setAllOpen(true); }}>All filters</button>} />
          )}
          <CCTable label="Hold records" minWidth="1100px" empty={visible.length === 0} emptyIcon={Lock}
            emptyTitle={isFiltered ? 'No records match your search' : { hold: 'No records on hold', released: 'No released records', deleted: 'No deleted records' }[tab]}
            emptyText={isFiltered ? 'Try a different name, ID or filter.' : { hold: 'Held records appear here until they are released.', released: 'Records you release appear here until they are batched.', deleted: 'Records you delete from hold appear here.' }[tab]}>
            <thead>
              <tr>
                <th className={s.checkTh}>
                  <input className="cc-checkbox__input" type="checkbox" aria-label="Select all records on this tab" checked={visible.length > 0 && selIds.length === visible.length}
                    onChange={(e) => { const o: Record<string, boolean> = {}; if (e.target.checked) visible.forEach((r) => { o[r.id] = true; }); setSel(o); }} />
                </th>
                {sortTh('name', 'Name')}
                <th>Type</th>
                {sortTh('cred', 'Credential')}
                {sortTh('conf', 'Conferral Date')}
                {sortTh('ordered', 'Order Date', <span title="Date the learner's order was placed" role="img" aria-label="Date the learner's order was placed" style={{ display: 'inline-flex' }}><HelpCircle size={14} aria-hidden="true" /></span>)}
                <th>{tab === 'deleted' ? '' : 'Actions'}</th>
                <th style={{ width: 56 }}><span className="sr-only">More actions</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const ts = typesIn(r, tab); const canRevert = tab === 'released' && ts.some((t) => !isBatched(r, t));
                return (
                  <tr key={r.id} className={s.row} data-on={openId === r.id || !!sel[r.id]} onClick={() => openRow(r.id)}>
                    <td className={s.checkTd} onClick={(e) => e.stopPropagation()}>
                      <input className="cc-checkbox__input" type="checkbox" aria-label={`Select ${r.name}`} checked={!!sel[r.id]}
                        onChange={(e) => { const o = { ...sel }; if (e.target.checked) o[r.id] = true; else delete o[r.id]; setSel(o); }} />
                    </td>
                    <td>
                      <button type="button" className={s.nameBtn} aria-label={`View hold record details for ${r.name}`} onClick={(e) => { e.stopPropagation(); openRow(r.id); }}>{r.name}</button>
                      <div className={s.sub}>{r.indId || 'ID Not Provided'}</div>
                    </td>
                    <td><div className={s.badges}>{ts.map((t) => <span key={t} className={`cc-badge cc-badge--square ${TB[t].badge}`}>{TB[t].label}</span>)}</div></td>
                    <td>{r.credential}</td>
                    <td className={s.nowrap}>{r.conferral}</td>
                    <td className={`${s.nowrap} ${hmView === 'expiring' ? s.soon : ''}`}>{r.ordered}</td>
                    <td onClick={(e) => e.stopPropagation()}>
                      {tab === 'hold' && <button type="button" className="cc-btn cc-btn--secondary cc-btn--sm" aria-label={`Release hold for ${r.name}`} onClick={() => ask('release', [r.id])}>Release hold</button>}
                      {canRevert && <button type="button" className="cc-btn cc-btn--secondary cc-btn--sm" aria-label={`Revert hold for ${r.name}`} onClick={() => ask('revert', [r.id])}><RotateCcw size={16} aria-hidden="true" />Revert hold</button>}
                      {tab === 'released' && !canRevert && <span className={s.batched} title="Already batched into an order, so it can't be reverted"><Package size={16} aria-hidden="true" />Batched</span>}
                    </td>
                    <td onClick={(e) => e.stopPropagation()}>
                      <PopMenu label="Record actions" open={rowMenu === r.id} setOpen={(o) => setRowMenu(o ? r.id : null)}
                        trigger={(t) => <button {...t} type="button" className="cc-icon-btn" aria-label={`More actions for ${r.name}`} title="More actions"><MoreVertical size={20} aria-hidden="true" /></button>}>
                        <MenuItem icon={<Pencil />} onClick={() => { openRow(r.id); startEdit(r, 'credential'); }}>Edit</MenuItem>
                        <MenuItem icon={<History />} onClick={() => openRow(r.id, 'activity')}>Activity</MenuItem>
                        <MenuItem icon={<Upload />} onClick={() => toast('Export started', `Records for ${r.name} will download as a CSV file.`)}>Export</MenuItem>
                        {tab === 'hold' && <><MenuSep /><MenuItem danger icon={<Trash2 />} onClick={() => ask('delete', [r.id])}>Delete</MenuItem></>}
                      </PopMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </CCTable>
        </div>
        {selIds.length > 0 && (
          <BulkBar text={`${selRecs} ${selRecs === 1 ? 'record' : 'records'} selected`} onDeselect={() => setSel({})}>
            {tab === 'hold' && <>
              <button type="button" className="cc-btn cc-btn--destructive-secondary cc-btn--sm" onClick={() => ask('delete', selIds)}>Delete</button>
              <button type="button" className="cc-btn cc-btn--primary cc-btn--sm" onClick={() => ask('release', selIds)}>Release hold</button>
            </>}
            {tab === 'released' && (
              <button type="button" className="cc-btn cc-btn--primary cc-btn--sm" aria-disabled={!canBulkRevert}
                title={canBulkRevert ? undefined : batchedSel ? `${batchedSel}${batchedSel === 1 ? ' selected record has' : ' selected records have'} already been batched` : 'Batched records can’t be reverted'}
                onClick={() => canBulkRevert && ask('revert', revertableSel.map((r) => r.id))}><RotateCcw size={16} aria-hidden="true" />Revert holds</button>
            )}
          </BulkBar>
        )}
      </div>

      {open && (() => {
        const r = open; const idx = visible.findIndex((x) => x.id === r.id); const n = visible.length;
        const ed = edit && edit.id === r.id ? edit : null;
        const isAct = pView === 'activity' && !ed; const credTab = pView !== 'student';
        const ts = typesIn(r, tab); const shown = ts.length ? ts : r.types;
        const [stLabel, stBadge] = ({ hold: ['On Hold', 'cc-badge--error'], released: ['Released', 'cc-badge--success'], deleted: ['Deleted', ''] } as const)[tab];
        const other = r.types.filter((t) => !ts.includes(t)).map((t) => `${TB[t].label} is ${TAB_WORD[statusOf(r, t)]}`);
        const log = [...(logs[r.id] || []), ...holdSeedLog(r)];
        const delEntry = log.find((a) => /Deleted/.test(a.what));
        const canRevert = tab === 'released' && ts.some((t) => !isBatched(r, t));
        const field = (k: string, label: string, kind: 'text' | 'select' | 'area', req?: boolean) => {
          const err = ed?.err[k]; const id = 'hm-ed-' + k; const v = ed?.v[k] ?? '';
          const set = (val: string) => { if (!ed) return; const nv = { ...ed.v, [k]: val }; setEdit({ ...ed, v: nv, err: ed.tried ? validate(nv) : ed.err }); };
          return (
            <div className="cc-field" key={k}>
              <label className="cc-label" htmlFor={id}>{label}{req && <span className={s.req} aria-hidden="true"> *</span>}</label>
              {kind === 'text' && <input id={id} className="cc-input" type="text" value={v} aria-required={req || undefined} aria-invalid={!!err || undefined} aria-describedby={err ? id + '-err' : undefined} onChange={(e) => set(e.target.value)} />}
              {kind === 'select' && <select id={id} className="cc-input" value={v} onChange={(e) => set(e.target.value)}>{CREDS.map((c) => <option key={c} value={c}>{c}</option>)}</select>}
              {kind === 'area' && <textarea id={id} className="cc-input" rows={3} maxLength={500} value={v} onChange={(e) => set(e.target.value)} />}
              {err && <p id={id + '-err'} className={s.err}>{err}</p>}
            </div>
          );
        };
        const footer = ed ? (
          <>
            <button type="button" className="cc-btn cc-btn--secondary" onClick={() => setEdit(null)}>Cancel</button>
            <button type="button" className="cc-btn cc-btn--primary" onClick={saveEdit}>Save changes</button>
          </>
        ) : (
          <div className={s.foot}>
            <button type="button" className="cc-icon-btn" aria-label="Previous record" aria-disabled={idx <= 0} onClick={() => idx > 0 && setOpenId(visible[idx - 1].id)}><ChevronLeft size={20} aria-hidden="true" /></button>
            <button type="button" className="cc-icon-btn" aria-label="Next record" aria-disabled={idx < 0 || idx >= n - 1} onClick={() => idx > -1 && idx < n - 1 && setOpenId(visible[idx + 1].id)}><ChevronRight size={20} aria-hidden="true" /></button>
            <span role="status" className={s.pos}>{idx > -1 ? `${idx + 1} of ${n}` : ''}</span>
            <div className={s.footEnd}>
              {tab === 'hold' && <button type="button" className="cc-btn cc-btn--primary" onClick={() => ask('release', [r.id])}>Release hold</button>}
              {canRevert && <button type="button" className="cc-btn cc-btn--secondary" onClick={() => ask('revert', [r.id])}><RotateCcw size={16} aria-hidden="true" />Revert hold</button>}
            </div>
          </div>
        );
        return (
          <Drawer title={ed ? 'Edit Hold Record' : 'Hold Record Details'} onClose={onPanelClose} footer={footer}
            subtitle={<>
              {r.name}{r.indId ? ` - ${r.indId}` : ''}
              <br />
              <button type="button" className="cc-link-btn cc-link" style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}
                onClick={() => { setQ(r.name); setApplied({}); toast('Showing all records', `The list now shows every ${TAB_WORD[tab]} record for ${r.name}.`); }}>
                View all student records<ChevronRight size={16} aria-hidden="true" />
              </button>
            </>}>
            {!ed && (
              <div className={s.panelHeadActions} style={{ marginBottom: 'var(--space-4)' }}>
                {tab !== 'deleted' && <button type="button" className="cc-btn cc-btn--secondary cc-btn--sm" onClick={() => startEdit(r)}>Edit</button>}
                <PopMenu label="Record actions" open={pMenu} setOpen={setPMenu}
                  trigger={(t) => <button {...t} type="button" className="cc-icon-btn" aria-label="More record actions"><MoreVertical size={20} aria-hidden="true" /></button>}>
                  <MenuItem icon={<History />} onClick={() => { setPView('activity'); setEdit(null); }}>Activity</MenuItem>
                  <MenuItem icon={<Upload />} onClick={() => toast('Export started', `Records for ${r.name} will download as a CSV file.`)}>Export</MenuItem>
                  {tab === 'hold' && <><MenuSep /><MenuItem danger icon={<Trash2 />} onClick={() => ask('delete', [r.id])}>Delete</MenuItem></>}
                </PopMenu>
              </div>
            )}
            {isAct ? (
              <>
                <div className={s.backRow}>
                  <button type="button" className="cc-icon-btn" aria-label="Back to record details" onClick={() => setPView('credential')}><ArrowLeft size={20} aria-hidden="true" /></button>
                  <h3 className={s.h3}>Activity</h3>
                </div>
                <ActivityList items={log} />
              </>
            ) : (
              <>
                <div role="tablist" aria-label="Hold record details" className={s.panelTabs}>
                  <button type="button" role="tab" aria-selected={credTab} className={s.panelTab} onClick={() => setPView('credential')}>Credential</button>
                  <button type="button" role="tab" aria-selected={!credTab} className={s.panelTab} onClick={() => setPView('student')}>Student</button>
                </div>
                <div role="tabpanel">
                  {!ed && credTab && (
                    <>
                      <div className={s.statusBox}>
                        <div className={s.statusHead}><h3 className={s.h3}>Status</h3><span className={`cc-badge cc-badge--square ${stBadge}`}>{stLabel}</span></div>
                        {tab === 'deleted' && <p className={s.p}>{delEntry ? `${delEntry.who} deleted ${delEntry.when}` : 'Deleted'}</p>}
                        <p className={s.meta}><Clock size={16} aria-hidden="true" />Ordered on {r.ordered}</p>
                        <p className={s.meta}><GraduationCap size={16} aria-hidden="true" />Conferral date on {r.conferral}</p>
                      </div>
                      <dl className={s.dl}>
                        <div><dt>Type</dt><dd className={s.badges}>{shown.map((t) => <span key={t} className={`cc-badge cc-badge--square ${TB[t].badge}`}>{TB[t].label}</span>)}</dd></div>
                        <div><dt>Diploma Name</dt><dd>{r.diplomaName}</dd></div>
                        <div><dt>Credential</dt><dd>{r.credential}</dd></div>
                        <div><dt>Major</dt><dd>{r.major}</dd></div>
                      </dl>
                      {other.length > 0 && <p className={s.note}><Info size={16} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />{other.join('. ')}. Paper and digital records are managed separately.</p>}
                    </>
                  )}
                  {!ed && !credTab && (
                    <>
                      <dl className={s.dl}>
                        <div><dt>Name</dt><dd>{r.name}</dd></div>
                        <div><dt>Individual ID</dt><dd>{r.indId || 'ID Not Provided'}</dd></div>
                        <div><dt>Phone</dt><dd>{r.phone}</dd></div>
                        <div><dt>Email</dt><dd>{r.email}</dd></div>
                        <div><dt>Comment</dt><dd>{r.comment}</dd></div>
                        <div><dt>Service Type</dt><dd>{r.service}</dd></div>
                      </dl>
                      <div className={s.section}>
                        <h3 className={s.h3}>Shipping</h3>
                        <div className={s.addr}>
                          <p className={s.addrName}>{r.name}</p>
                          <p className={s.p}>{r.addr1}<br />{r.addr2}</p>
                          <div className={s.addrLinks}>
                            <button type="button" className="cc-link-btn cc-link cc-link--muted" onClick={() => toast('Address archived', `${r.addr1} was archived.`)}>Archive</button>
                            <button type="button" className="cc-link-btn cc-link" onClick={() => startEdit(r, 'student')}>Edit</button>
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                  {ed && (
                    <div className={s.form}>
                      {credTab ? <>
                        {field('diplomaName', 'Diploma Name', 'text', true)}
                        {field('credential', 'Credential', 'select', true)}
                        {field('major', 'Major', 'text', true)}
                      </> : <>
                        {field('phone', 'Phone', 'text')}
                        {field('email', 'Email', 'text', true)}
                        {field('comment', 'Comment', 'area')}
                        {field('street', 'Street address', 'text', true)}
                        {field('apt', 'Address 2', 'text')}
                        {field('city', 'City', 'text', true)}
                        {field('state', 'State', 'text')}
                        {field('zip', 'ZIP code', 'text')}
                      </>}
                    </div>
                  )}
                </div>
              </>
            )}
          </Drawer>
        );
      })()}

      {allOpen && (
        <>
          <div className={s.overlay} onClick={closeAll} aria-hidden="true" />
          <Drawer title="All filters" subtitle="Filters records in hold management." onClose={closeAll}
            footer={<>
              <button type="button" className="cc-btn cc-btn--secondary" onClick={() => { setApplied({}); setAllOpen(false); }}>Clear all</button>
              <button type="button" className="cc-btn cc-btn--primary" onClick={() => { setApplied(allDraft); setAllOpen(false); setFbOpen(true); }}>Apply filters</button>
            </>}>
            {([
              ['Filter by student', [['name', 'Name', plain(names)], ['type', 'Type', [{ value: 'paper', label: 'Paper' }, { value: 'digital', label: 'Digital' }]], ['cred', 'Credential', plain(creds)]]],
              ['Filter by date', [['order', 'Order Date', plain(confOpts)], ['conf', 'Conferral Date', plain(confOpts)]]],
            ] as [string, [string, string, { value: string; label: string }[]][]][]).map(([g, fields]) => (
              <fieldset key={g} className={s.fieldset} style={{ marginTop: 0, marginBottom: 'var(--space-6)' }}>
                <legend className={s.h3} style={{ marginBottom: 'var(--space-3)' }}>{g}</legend>
                <div className={s.form}>
                  {fields.map(([id, label, opts]) => (
                    <div className="cc-field" key={id}>
                      <label className="cc-label" htmlFor={`hm-all-${id}`}>{label}</label>
                      <select id={`hm-all-${id}`} className="cc-input" value={(allDraft[id] || [])[0] || ''}
                        onChange={(e) => setAllDraft({ ...allDraft, [id]: e.target.value ? [e.target.value] : [] })}>
                        <option value="">{label}</option>
                        {opts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </fieldset>
            ))}
          </Drawer>
        </>
      )}

      {expOpen && (
        <>
          <div className={s.overlay} onClick={closeExp} aria-hidden="true" />
          <Drawer title="Expiring Record Exports" subtitle="Automatically generated weekly exports of all records expiring within 60 days." onClose={closeExp}
            footer={<button type="button" className="cc-btn cc-btn--secondary" onClick={closeExp}>Close</button>}>
            {exps.length === 0 && <p className={s.p}>No scheduled exports have been generated yet.</p>}
            {exps.map((w, i) => {
              const name = `Records Expiring Soon - Week of ${w[0]}`;
              return (
                <div key={name} className={s.expRow}>
                  <div className={s.expMain}>
                    <span className={s.fileTag} aria-hidden="true">XLSX</span>
                    <div>
                      <button type="button" className="cc-link-btn cc-link" onClick={() => setPv(name)}>{name}</button>
                      <div className={s.sub}>Generated {w[1]}, 8:00 AM EST</div>
                    </div>
                  </div>
                  <div className={s.toolGroup} style={{ gap: 'var(--space-1)' }}>
                    <span className={s.sub}>{450 + ((i * 37) % 70)}kb</span>
                    <button type="button" className="cc-icon-btn" title="Download" aria-label={`Download ${name}`} onClick={() => download(name)}><Download size={16} aria-hidden="true" /></button>
                    <button type="button" className="cc-icon-btn" title="Preview" aria-label={`Preview ${name}`} onClick={() => setPv(name)}><Eye size={16} aria-hidden="true" /></button>
                  </div>
                </div>
              );
            })}
          </Drawer>
        </>
      )}

      {pv && (
        <Dialog title="Preview" description={pv} onClose={closePv} maxWidth={880}
          actions={<>
            <span className={s.pos} style={{ marginRight: 'auto', alignSelf: 'center' }}>1 of 1</span>
            <button type="button" className="cc-btn cc-btn--secondary" onClick={closePv}>Close</button>
            <button type="button" className="cc-btn cc-btn--primary" onClick={() => download(pv)}><Download size={16} aria-hidden="true" />Download</button>
          </>}>
          <div className={s.pvScroll} tabIndex={0} role="region" aria-label="Preview table">
            <table className={s.pvTable}>
              <thead><tr>{EXP_COLS.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{expRows.map((r) => <tr key={r.id}>{cells(r).map((v, i) => <td key={i}>{v}</td>)}</tr>)}</tbody>
            </table>
          </div>
        </Dialog>
      )}

      {dlg && <HoldDialog d={dlg} setD={setDlg} rows={rows} statusOf={statusOf} eligible={eligible} onClose={closeDlg} onConfirm={apply} />}
    </>
  );
}

function HoldDialog({ d, setD, rows, statusOf, eligible, onClose, onConfirm }: {
  d: { kind: Kind; ids: string[]; types: Record<HoldType, boolean>; service: string };
  setD: (d: { kind: Kind; ids: string[]; types: Record<HoldType, boolean>; service: string }) => void;
  rows: Rec[]; statusOf: (r: HoldRecord, t: HoldType) => HoldStatus; eligible: (k: Kind, r: HoldRecord, t: HoldType) => boolean;
  onClose: () => void; onConfirm: (d: { kind: Kind; ids: string[]; types: Record<HoldType, boolean>; service: string }) => void;
}) {
  const recs = rows.filter((r) => d.ids.includes(r.id));
  const cnt = { paper: 0, digital: 0 };
  recs.forEach((r) => r.types.forEach((t) => { if (eligible(d.kind, r, t)) cnt[t]++; }));
  const pick = { paper: d.types.paper ? cnt.paper : 0, digital: d.types.digital ? cnt.digital : 0 };
  const total = pick.paper + pick.digital;
  const who = recs.length === 1 ? recs[0].name : `${recs.length} learners`;
  const K = {
    release: { title: 'Release records on hold', lead: 'Are you sure you want to release the hold on the selected records for ', tail: '? They will be batched per your schedule and move to the released tab.', label: 'Release hold', cls: 'cc-btn--primary', icon: <CheckCircle2 size={20} aria-hidden="true" /> },
    revert: { title: 'Revert records to hold', lead: 'Are you sure you want to revert the hold on the selected records for ', tail: '? They will move back to the on hold tab.', label: 'Revert hold', cls: 'cc-btn--primary', icon: <RotateCcw size={20} aria-hidden="true" /> },
    delete: { title: 'Delete records', lead: 'Are you sure you want to delete the selected records for ', tail: '? They will move to the deleted tab.', label: 'Delete records', cls: 'cc-btn--destructive', icon: <XCircle size={20} aria-hidden="true" /> },
  }[d.kind];

  let al: { warn: boolean; title: string; text: string } | null = null;
  if (recs.length === 1) {
    const r0 = recs[0]; const st0: HoldStatus = d.kind === 'revert' ? 'released' : 'hold';
    const verbIng = d.kind === 'revert' ? 'Reverting' : d.kind === 'delete' ? 'Deleting' : 'Releasing';
    const verb = d.kind === 'revert' ? 'revert' : d.kind === 'delete' ? 'delete' : 'release';
    const verbEd = d.kind === 'revert' ? 'reverted' : d.kind === 'delete' ? 'deleted' : 'released';
    if (!r0.indId && rows.some((x) => x.id !== r0.id && !x.indId && x.name === r0.name && x.types.some((t) => statusOf(x, t) === st0)))
      al = { warn: true, title: 'Possible related record found', text: `A record with matching details was found, but no ID was provided for either record. This may represent a record match for the same student. ${verbIng} this record will not ${verb} the related one.` };
    else if (r0.indId && rows.some((x) => x.id !== r0.id && x.indId === r0.indId && x.types.some((t) => statusOf(x, t) === st0)))
      al = { warn: false, title: 'Additional records found for this student', text: `This student has other records ${st0 === 'hold' ? 'on hold' : 'released'} that are not included here. Only the records selected below will be ${verbEd}.` };
  }
  const parts: string[] = []; if (pick.paper) parts.push(`${pick.paper} paper`); if (pick.digital) parts.push(`${pick.digital} digital`);
  const last = pick.digital || pick.paper;
  const showSum = d.kind !== 'release' || !!al || total < cnt.paper + cnt.digital;
  const pre = d.kind === 'delete' ? 'This will delete ' : d.kind === 'revert' ? 'This will place ' : 'This will release ';
  const post = (last === 1 ? ' record' : ' records') + (d.kind === 'revert' ? ' on hold.' : '.');

  return (
    <Dialog role="alertdialog" title={K.title} onClose={onClose}
      description={<><span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 'var(--space-2)', color: d.kind === 'delete' ? 'var(--error-600)' : 'var(--blue-600)' }}>{K.icon}</span>{K.lead}<b>{who}</b>{K.tail}</>}
      actions={<>
        <button type="button" className="cc-btn cc-btn--secondary" onClick={onClose}>Cancel</button>
        <button type="button" className={`cc-btn ${K.cls}`} aria-disabled={!total} onClick={() => total && onConfirm(d)}>{d.kind === 'revert' && <RotateCcw size={16} aria-hidden="true" />}{K.label}</button>
      </>}>
      {al && (
        <div role="status" className={`cc-alert ${al.warn ? 'cc-alert--warning' : 'cc-alert--info'} ${s.dlgAlert}`}>
          {al.warn ? <AlertTriangle className="cc-alert__icon" aria-hidden="true" /> : <Info className="cc-alert__icon" aria-hidden="true" />}
          <div className="cc-alert__body"><p className="cc-alert__title">{al.title}</p><p className="cc-alert__message">{al.text}</p></div>
        </div>
      )}
      <fieldset className={s.fieldset}>
        <legend className={s.legend}>Records <span className={s.legendSub}>{total} selected</span></legend>
        {(['paper', 'digital'] as HoldType[]).filter((t) => cnt[t] > 0).map((t) => (
          <label key={t} htmlFor={`hm-dlg-${t}`} className={s.choice}>
            <input id={`hm-dlg-${t}`} className="cc-checkbox__input" type="checkbox" checked={d.types[t]} onChange={(e) => setD({ ...d, types: { ...d.types, [t]: e.target.checked } })} />
            <span className={s.choiceGrow}>{TB[t].label}</span>
            <span className={s.legendSub}>{cnt[t]} {cnt[t] === 1 ? 'record' : 'records'}</span>
          </label>
        ))}
      </fieldset>
      {d.kind === 'release' && pick.paper > 0 && (
        <fieldset className={s.fieldset}>
          <legend className={s.legend}>Service type
            <span title="Applies to paper records. Expedited service ships the order faster." role="img" aria-label="Applies to paper records. Expedited service ships the order faster." style={{ display: 'inline-flex' }}><HelpCircle size={14} aria-hidden="true" /></span>
          </legend>
          {SERVICE_TYPES.map(([k, l, desc]) => (
            <label key={k} htmlFor={`hm-svc-${k}`} className={s.choice}>
              <input id={`hm-svc-${k}`} className="cc-radio__input" type="radio" name="hm-service" checked={d.service === k} onChange={() => setD({ ...d, service: k })} />
              <span><b>{l}</b> {desc}</span>
            </label>
          ))}
        </fieldset>
      )}
      {showSum && (
        <p role="status" className={s.dlgSum}>
          {parts.length ? <>{pre}<b>{parts[0]}</b>{parts[1] && <> and <b>{parts[1]}</b></>}{post}</> : 'Select at least one record type.'}
        </p>
      )}
    </Dialog>
  );
}
