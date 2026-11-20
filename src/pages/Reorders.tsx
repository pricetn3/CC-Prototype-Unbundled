/* Orders › Reorder Management: approve and deny pending student reorders. In-memory state; resets on reload. */

import { useCallback, useMemo, useRef, useState } from 'react';
import {
  AlertCircle, ArrowLeft, CheckCircle2, ChevronLeft, ChevronRight, ChevronsUpDown, Clock, Filter, GraduationCap, History,
  Lock, MoreVertical, Plus, RotateCcw, Save, Upload, XCircle,
} from 'lucide-react';
import { useStore } from '../data/store';
import { PAY_META, reorderSeedLog, seedReorders, type ActivityItem, type Reorder, type ReorderStatus } from '../data/reorders';
import { CCTable } from '../components/CCTable';
import { SearchField } from '../components/SearchField';
import { SegTabs } from '../components/SegTabs';
import { Dialog } from '../components/Dialog';
import { Drawer } from '../components/Drawer';
import { useToast } from '../components/Toast';
import {
  ActivityList, BulkBar, ChipFilterBar, ExportMenu, MenuItem, OrgPicker, PopMenu, countApplied, passes, type Applied, type ChipDef,
} from '../components/OrdersMgmtKit';
import s from './OrdersMgmt.module.css';

type SortKey = 'name' | 'conf' | 'cred' | 'major' | 'exp' | 'dec';
type EditVals = Record<string, string>;
const EDIT_KEYS = ['conferralIso', 'reason', 'requestedName', 'credential', 'major', 'note', 'name', 'indId', 'phone', 'email', 'comment', 'deliveryName', 'country', 'street', 'apt', 'city', 'state', 'zip'];
const CRED_KEYS = ['conferralIso', 'reason', 'requestedName', 'credential', 'major', 'note'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const STATUS_BADGE: Record<string, [string, string]> = {
  pending: ['Pending', 'cc-badge--warning'], approved: ['Approved', 'cc-badge--success'], denied: ['Denied', 'cc-badge--error'], expired: ['Expired', 'cc-badge--error'],
};

function validate(v: EditVals) {
  const e: Record<string, string> = {};
  const t = (x?: string) => (x ?? '').trim();
  const nameRe = /^[A-Za-zÀ-ÿ' .-]+$/; const textRe = /^[A-Za-z0-9À-ÿ&,.'()/ -]+$/;
  if (!t(v.conferralIso)) e.conferralIso = 'Please enter a valid format (MM/DD/YYYY) or select a date.';
  if (!t(v.reason)) e.reason = 'Please select a reason.';
  if (!t(v.requestedName) || !nameRe.test(t(v.requestedName))) e.requestedName = 'Please enter a valid name.';
  if (!t(v.credential) || !textRe.test(t(v.credential))) e.credential = 'Please enter a valid credential.';
  if (!t(v.major) || !textRe.test(t(v.major))) e.major = 'Please enter a valid major.';
  if (!t(v.name) || !nameRe.test(t(v.name)) || t(v.name).split(/\s+/).length < 2) e.name = 'Please enter a valid full name.';
  if (t(v.indId) && !/^[A-Za-z0-9-]+$/.test(t(v.indId))) e.indId = 'Please enter a valid individual ID.';
  if (!t(v.phone) || t(v.phone).replace(/\D/g, '').length < 10) e.phone = 'Please enter a valid phone number.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t(v.email))) e.email = 'Please enter a valid email address.';
  if (!t(v.deliveryName) || !nameRe.test(t(v.deliveryName)) || t(v.deliveryName).split(/\s+/).length < 2) e.deliveryName = 'Please enter a valid full name.';
  if (!t(v.country)) e.country = 'Please select a country.';
  if (!t(v.street) || !/\d/.test(t(v.street))) e.street = 'Please enter a valid street address.';
  if (!t(v.city) || !nameRe.test(t(v.city))) e.city = 'Please enter a valid city.';
  if (!t(v.state)) e.state = 'Please select a state.';
  if (!/^\d{5}(-\d{4})?$/.test(t(v.zip))) e.zip = 'Please enter a valid zip code.';
  return e;
}

const nowText = () => new Date().toLocaleString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' ET';
const expDate = (d: number) => new Date(Date.now() + d * 864e5).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const focusLater = (id: string) => setTimeout(() => document.getElementById(id)?.focus(), 60);

export function Reorders() {
  const { orgs } = useStore();
  const toast = useToast();
  const [org, setOrg] = useState(orgs[0]?.id ?? '');
  const [edits, setEdits] = useState<Record<string, EditVals & { conferral?: string }>>({});
  const [statusMap, setStatusMap] = useState<Record<string, ReorderStatus>>({});
  const [decided, setDecided] = useState<Record<string, { text: string; ts: number }>>({});
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [logs, setLogs] = useState<Record<string, ActivityItem[]>>({});
  const [tab, setTab] = useState<ReorderStatus>('pending');
  const [q, setQ] = useState('');
  const [fbOpen, setFbOpen] = useState(false);
  const [applied, setApplied] = useState<Applied>({});
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);
  const [sel, setSel] = useState<Record<string, boolean>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [pTab, setPTab] = useState<'credential' | 'student'>('credential');
  const [pView, setPView] = useState<'details' | 'activity'>('details');
  const [pMenu, setPMenu] = useState(false);
  const [edit, setEdit] = useState<{ id: string; v: EditVals; orig: EditVals; err: Record<string, string>; tried: boolean; showApt: boolean } | null>(null);
  const [discard, setDiscard] = useState<{ thenClose: boolean } | null>(null);
  const [dlg, setDlg] = useState<{ kind: 'approve' | 'deny'; ids: string[]; reason: string } | null>(null);

  const rows = useMemo(() => seedReorders().map((r) => {
    const o = edits[r.id];
    const x: Reorder & { addr1: string; addr2: string } = { ...(o ? { ...r, ...o } as Reorder : r), addr1: '', addr2: '' };
    x.addr1 = x.street + (x.apt ? ', ' + x.apt : ''); x.addr2 = `${x.city}, ${x.state} ${x.zip}, ${x.country}`;
    return x;
  }), [edits]);
  const statusOf = (r: Reorder) => statusMap[r.id] || r.init;
  const decOf = (r: Reorder) => decided[r.id] || { text: r.decidedAt, ts: r.decidedTs };
  const decDay = (r: Reorder) => (decOf(r).text || '').split(',')[0];
  const isPending = tab === 'pending';

  const counts = { pending: 0, approved: 0, denied: 0 };
  rows.forEach((r) => { counts[statusOf(r)]++; });
  const inTab = rows.filter((r) => statusOf(r) === tab);
  const uniq = (f: (r: Reorder) => string, sortF?: (a: Reorder, b: Reorder) => number) => {
    const seen = new Set<string>(); const out: Reorder[] = [];
    inTab.slice().sort(sortF ?? (() => 0)).forEach((r) => { const v = f(r); if (!seen.has(v)) { seen.add(v); out.push(r); } });
    return out;
  };
  const payOrder = ({ pending: ['created', 'payer', 'completed', 'cancelled'], approved: ['completed', 'approved'], denied: ['completed', 'approved', 'voided', 'expired'] } as const)[tab];
  const plain = (vals: string[]) => vals.map((v) => ({ value: v, label: v }));
  const defs: ChipDef[] = [
    { id: 'name', label: 'Name', kind: 'plain', options: plain([...new Set(inTab.map((r) => r.name))].sort()) },
    { id: 'conf', label: 'Conferral Date', kind: 'plain', options: plain(uniq((r) => r.conferral, (a, b) => (a.conferralIso < b.conferralIso ? -1 : 1)).map((r) => r.conferral)) },
    { id: 'cred', label: 'Credential', kind: 'plain', width: 260, options: plain([...new Set(inTab.map((r) => r.credential))].sort()) },
    { id: 'major', label: 'Major', kind: 'plain', options: plain([...new Set(inTab.map((r) => r.major))].sort()) },
    { id: 'pay', label: 'Payment Status', kind: 'badge', options: payOrder.map((k) => ({ value: k, label: PAY_META[k].label, badge: PAY_META[k].badge })) },
    isPending
      ? { id: 'exp', label: 'Expiration', kind: 'dual', options: uniq((r) => String(r.days), (a, b) => a.days - b.days).map((r) => ({ value: String(r.days), label: expDate(r.days), sub: r.days + (r.days === 1 ? ' day' : ' days') })) }
      : { id: 'dec', label: tab === 'approved' ? 'Approved Date' : 'Denied Date', kind: 'plain', options: plain(uniq(decDay, (a, b) => decOf(b).ts - decOf(a).ts).map(decDay)) },
  ];
  const qn = q.trim().toLowerCase();
  const filtered = inTab.filter((r) => passes(applied, 'name', r.name) && passes(applied, 'conf', r.conferral) && passes(applied, 'cred', r.credential)
    && passes(applied, 'major', r.major) && passes(applied, 'pay', r.payment) && (!isPending || passes(applied, 'exp', String(r.days)))
    && (isPending || passes(applied, 'dec', decDay(r))) && (!qn || [r.name, r.indId, r.credential, r.major].join(' ').toLowerCase().includes(qn)));
  const srt = sort ?? (isPending ? { key: 'exp' as SortKey, dir: 1 as const } : { key: 'dec' as SortKey, dir: -1 as const });
  const keyFn: Record<SortKey, (r: Reorder) => string | number> = {
    name: (r) => r.name.toLowerCase(), conf: (r) => r.conferralIso, cred: (r) => r.credential.toLowerCase(), major: (r) => r.major.toLowerCase(), exp: (r) => r.days, dec: (r) => decOf(r).ts,
  };
  const visible = filtered.slice().sort((a, b) => { const x = keyFn[srt.key](a), y = keyFn[srt.key](b); return (x < y ? -1 : x > y ? 1 : 0) * srt.dir; });
  const selIds = visible.filter((r) => sel[r.id]).map((r) => r.id);
  const nF = countApplied(applied);
  const isFiltered = !!qn || nF > 0;

  const switchTab = (t: ReorderStatus) => { setTab(t); setSel({}); setOpenId(null); setEdit(null); setSort(null); setApplied({}); };
  const ask = (ids: string[], kind: 'approve' | 'deny') => { if (ids.length) { setDlg({ kind, ids, reason: '' }); if (kind === 'deny') focusLater('ro-deny-reason'); } };
  const decide = (ids: string[], status: ReorderStatus, reason: string) => {
    const now = nowText(); const ts = Date.now();
    const map = { ...statusMap }; const at = { ...decided }; const rs = { ...reasons }; const lg = { ...logs };
    ids.forEach((id) => {
      map[id] = status; at[id] = { text: now, ts };
      if (status === 'denied') rs[id] = reason.trim();
      lg[id] = [{ who: 'Jordan A', ini: 'JA', what: status === 'approved' ? 'Approved reorder' : 'Denied reorder', when: now, ago: 'Just now' }, ...(lg[id] || [])];
    });
    if (openId && ids.includes(openId)) {
      const pend = rows.filter((r) => (map[r.id] || r.init) === 'pending');
      setOpenId(pend.length ? pend[0].id : null);
    }
    setStatusMap(map); setDecided(at); setReasons(rs); setLogs(lg); setSel({}); setDlg(null); setPView('details');
    const n = ids.length; const isA = status === 'approved';
    toast(`Successfully ${isA ? 'approved' : 'denied'} reorder${n === 1 ? '' : 's'}`,
      `The reorder${n === 1 ? ' selected was ' : 's selected have been '}${isA ? 'approved' : 'denied'} and ${n === 1 ? 'is' : 'are'} now available on the ${isA ? 'approved' : 'denied'} tab.`);
  };

  const openRow = (id: string) => { setOpenId(id); setPTab('credential'); setPView('details'); setPMenu(false); };
  const closePanel = () => setOpenId(null);
  const dirty = !!edit && EDIT_KEYS.some((k) => (edit.v[k] || '') !== (edit.orig[k] || ''));
  const startEdit = (r: Reorder) => {
    const v: EditVals = {}; EDIT_KEYS.forEach((k) => { v[k] = String((r as unknown as Record<string, unknown>)[k] ?? ''); });
    setEdit({ id: r.id, v, orig: { ...v }, err: {}, tried: false, showApt: !!r.apt });
  };
  const cancelEdit = (thenClose: boolean) => {
    if (dirty) { setDiscard({ thenClose }); return; }
    setEdit(null); if (thenClose) closePanel();
  };
  const saveEdit = (): boolean => {
    if (!edit) return true;
    const err = validate(edit.v);
    if (Object.keys(err).length) {
      const curHas = Object.keys(err).some((k) => CRED_KEYS.includes(k) === (pTab === 'credential'));
      setEdit({ ...edit, tried: true, err });
      if (!curHas) setPTab(pTab === 'credential' ? 'student' : 'credential');
      setTimeout(() => (document.querySelector('#ro-edit [aria-invalid="true"]') as HTMLElement | null)?.focus(), 80);
      return false;
    }
    if (!dirty) { setEdit(null); return true; }
    const p = edit.v.conferralIso.split('-');
    setEdits({ ...edits, [edit.id]: { ...(edits[edit.id] || {}), ...edit.v, conferral: MONTHS[Number(p[1]) - 1] + ' ' + p[0] } });
    setEdit(null);
    toast('Reorder details saved', `Your changes to ${edit.v.name.trim()}’s reorder have been saved.`);
    return true;
  };
  const setField = (k: string, val: string) => {
    if (!edit) return;
    const v = { ...edit.v, [k]: val };
    setEdit({ ...edit, v, err: edit.tried ? validate(v) : edit.err });
  };

  const sortTh = (key: SortKey, label: string, w: string) => {
    const on = srt.key === key;
    return (
      <th className={s.sortTh} style={{ width: w }} aria-sort={on ? (srt.dir === 1 ? 'ascending' : 'descending') : 'none'}>
        <button type="button" className={s.sortBtn} onClick={() => setSort({ key, dir: on ? (-srt.dir as 1 | -1) : 1 })}>
          {label}<ChevronsUpDown size={14} className={s.sortIcon} aria-hidden="true" />
        </button>
      </th>
    );
  };

  const open = rows.find((r) => r.id === openId) || null;
  // Dialog and Drawer re-run their focus effect when onClose changes, so keep these stable.
  const panelCloseRef = useRef<() => void>(() => {});
  panelCloseRef.current = () => { if (dlg || discard) return; if (edit) cancelEdit(true); else closePanel(); };
  const onPanelClose = useCallback(() => panelCloseRef.current(), []);
  const closeDlg = useCallback(() => setDlg(null), []);
  const closeDiscard = useCallback(() => setDiscard(null), []);

  return (
    <>
      <div className={`cc-scr ${s.header}`}>
        <div className={s.headText}>
          <h1 className={s.title}>Reorder Management</h1>
          <p className={s.subtitle}>Approve and deny pending student reorders.</p>
          <p className={s.contact}>Reorder contact: <a className="cc-link" href="mailto:dpark@organization.com">dpark@organization.com</a>, <a className="cc-link" href="tel:+11234567890">+1 (123) 456-7890</a></p>
        </div>
        <OrgPicker value={org} onChange={(v) => { setOrg(v); setSel({}); setOpenId(null); }} />
      </div>

      <div className={s.body}>
        <div className={s.card}>
          <div className={s.toolbar}>
            <div className={s.toolGroup}>
              <SegTabs inset label="Reorder status" value={tab} onChange={switchTab}
                tabs={[{ key: 'pending', label: 'Pending', count: `${counts.pending} ${counts.pending === 1 ? 'reorder' : 'reorders'}` }, { key: 'approved', label: 'Approved' }, { key: 'denied', label: 'Denied' }]} />
              <span role="status" className={s.found}>{!isPending || isFiltered ? `${visible.length} ${visible.length === 1 ? 'result' : 'results'} found` : ''}</span>
            </div>
            <div className={s.toolGroup}>
              <SearchField value={q} onChange={setQ} width={300} placeholder="Search" aria-label="Search reorders" clearable />
              <button type="button" className="cc-btn cc-btn--secondary" aria-expanded={fbOpen} aria-controls="ro-filterbar" onClick={() => setFbOpen(!fbOpen)}>
                <Filter size={16} aria-hidden="true" />Filter{nF > 0 && <span className={s.filterCount}>{nF}<span className="sr-only"> applied</span></span>}
              </button>
              <ExportMenu label="Export reorders" selCount={selIds.length}
                onAll={() => toast('Export started', `${visible.length} ${tab} reorders will download as a CSV file.`)}
                onSel={() => toast('Export started', `${selIds.length} selected reorders will download as a CSV file.`)} />
            </div>
          </div>
          {fbOpen && <ChipFilterBar key={tab} id="ro-filterbar" defs={defs} applied={applied} onApply={setApplied} />}
          <CCTable label="Reorders" minWidth="1180px" empty={visible.length === 0} emptyIcon={RotateCcw}
            emptyTitle={isFiltered ? 'No reorders match your search' : isPending ? 'No pending reorders' : `No ${tab} reorders yet`}
            emptyText={isFiltered ? 'Try a different name, ID or filter.' : isPending ? 'New student reorder requests appear here for review.' : `Reorders you ${tab === 'approved' ? 'approve' : 'deny'} appear here.`}>
            <thead>
              <tr>
                <th className={s.checkTh}>
                  <input className="cc-checkbox__input" type="checkbox" aria-label="Select all reorders on this tab"
                    checked={visible.length > 0 && selIds.length === visible.length}
                    onChange={(e) => { const o: Record<string, boolean> = {}; if (e.target.checked) visible.forEach((r) => { o[r.id] = true; }); setSel(o); }} />
                </th>
                {sortTh('name', 'Name', '170px')}
                {sortTh('conf', 'Conferral Date', '130px')}
                {sortTh('cred', 'Credential', '220px')}
                {sortTh('major', 'Major', '170px')}
                <th style={{ width: 170 }}>Payment Status</th>
                {isPending ? <>{sortTh('exp', 'Expiration', '160px')}<th style={{ width: 170 }}>Actions</th></> : sortTh('dec', tab === 'approved' ? 'Approved Date' : 'Denied Date', '230px')}
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => {
                const m = PAY_META[r.payment]; const soon = r.days <= 5; const dec = decOf(r);
                return (
                  <tr key={r.id} className={s.row} data-on={openId === r.id || !!sel[r.id]} onClick={() => openRow(r.id)}>
                    <td className={s.checkTd} onClick={(e) => e.stopPropagation()}>
                      <input className="cc-checkbox__input" type="checkbox" aria-label={`Select ${r.name}`} checked={!!sel[r.id]}
                        onChange={(e) => { const o = { ...sel }; if (e.target.checked) o[r.id] = true; else delete o[r.id]; setSel(o); }} />
                    </td>
                    <td><button type="button" className={s.nameBtn} aria-label={`View reorder details for ${r.name}`} onClick={(e) => { e.stopPropagation(); openRow(r.id); }}>{r.name}</button></td>
                    <td className={s.nowrap}>{r.conferral}</td>
                    <td>{r.credential}</td>
                    <td>{r.major}</td>
                    <td><span className={`cc-badge cc-badge--square ${m.badge}`}>{m.label}</span></td>
                    <td className={`${s.nowrap} ${isPending && soon ? s.soon : ''}`}>
                      {isPending ? `Expiring in ${r.days} days` : `${tab === 'approved' ? 'Approved ' : r.expired ? 'Expired ' : 'Denied '}${dec.text || ''}`}
                    </td>
                    {isPending && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className={s.acts}>
                          <button type="button" className="cc-btn cc-btn--secondary cc-btn--sm" aria-label={`Approve reorder for ${r.name}`} onClick={() => ask([r.id], 'approve')}>Approve</button>
                          <button type="button" className="cc-btn cc-btn--destructive-secondary cc-btn--sm" aria-label={`Deny reorder for ${r.name}`} onClick={() => ask([r.id], 'deny')}>Deny</button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </CCTable>
        </div>
        {selIds.length > 0 && (
          <BulkBar text={`${selIds.length} selected`} onDeselect={() => setSel({})}>
            {isPending && <>
              <button type="button" className="cc-btn cc-btn--destructive-secondary cc-btn--sm" onClick={() => ask(selIds, 'deny')}>Deny</button>
              <button type="button" className="cc-btn cc-btn--primary cc-btn--sm" onClick={() => ask(selIds, 'approve')}>Approve</button>
            </>}
          </BulkBar>
        )}
      </div>

      {open && (
        <ReorderPanel
          r={open} status={statusOf(open)} visible={visible} edit={edit} pTab={pTab} setPTab={setPTab} pView={pView} setPView={setPView}
          pMenu={pMenu} setPMenu={setPMenu} log={[...(logs[open.id] || []), ...reorderSeedLog(open)]}
          denyReason={reasons[open.id] || open.denySeed || 'No reason given.'}
          onClose={onPanelClose} onNav={(id) => { setOpenId(id); setPMenu(false); }}
          onAsk={(k) => ask([open.id], k)} onEdit={(tabK) => { if (tabK) setPTab(tabK); startEdit(open); }}
          onExport={() => toast('Export started', `The reorder for ${open.name} will download as a CSV file.`)}
          onArchive={() => toast('Address archived', `${open.addr1} was archived.`)}
          setField={setField} onAddApt={() => { if (edit) { setEdit({ ...edit, showApt: true }); focusLater('ro-ed-apt'); } }}
          onSave={saveEdit} onCancel={() => cancelEdit(false)}
        />
      )}

      {dlg && (() => {
        const n = dlg.ids.length; const isA = dlg.kind === 'approve';
        const who = n === 1 ? rows.find((r) => r.id === dlg.ids[0])?.name : String(n);
        return (
          <Dialog role="alertdialog" title={`${isA ? 'Approve' : 'Deny'} ${n === 1 ? 'reorder' : `${n} reorders`}`} onClose={closeDlg}
            description={<>
              <span style={{ display: 'inline-flex', verticalAlign: 'middle', marginRight: 'var(--space-2)', color: isA ? 'var(--success-600)' : 'var(--error-600)' }}>
                {isA ? <CheckCircle2 size={20} aria-hidden="true" /> : <XCircle size={20} aria-hidden="true" />}
              </span>
              Are you sure you want to {isA ? 'approve' : 'deny'}{n === 1 ? ' the reorder for ' : ' these '}<b>{who}</b>{n === 1 ? '' : ' reorder requests'}? {n === 1 ? 'It' : 'They'} will move to the {isA ? 'approved' : 'denied'} tab.
            </>}
            actions={<>
              <button type="button" className="cc-btn cc-btn--secondary" onClick={() => setDlg(null)}>Cancel</button>
              <button type="button" className={`cc-btn ${isA ? 'cc-btn--primary' : 'cc-btn--destructive'}`} onClick={() => decide(dlg.ids, isA ? 'approved' : 'denied', dlg.reason)}>{isA ? 'Approve' : 'Deny'}</button>
            </>}>
            {!isA && (
              <div className="cc-field" style={{ marginTop: 'var(--space-4)' }}>
                <label className="cc-label" htmlFor="ro-deny-reason">Reason for denial</label>
                <textarea id="ro-deny-reason" className="cc-input" rows={4} maxLength={250} placeholder="Please provide a reason for denial (optional)."
                  aria-describedby="ro-deny-count" value={dlg.reason} onChange={(e) => setDlg({ ...dlg, reason: e.target.value.slice(0, 250) })} />
                <p id="ro-deny-count" className="cc-hint" aria-live="polite">{250 - dlg.reason.length}/250 characters remaining</p>
              </div>
            )}
          </Dialog>
        );
      })()}

      {discard && (
        <Dialog role="alertdialog" title="Unsaved changes" description={<><Save size={18} aria-hidden="true" style={{ verticalAlign: 'middle', marginRight: 'var(--space-2)' }} />Are you sure you want to leave this page? All changes will be lost.</>}
          onClose={closeDiscard}
          actions={<>
            <button type="button" className="cc-btn cc-btn--tertiary" onClick={() => setDiscard(null)}>Cancel</button>
            <button type="button" className="cc-btn cc-btn--secondary" onClick={() => { const c = discard.thenClose; setDiscard(null); setEdit(null); if (c) closePanel(); }}>Discard changes</button>
            <button type="button" className="cc-btn cc-btn--primary" onClick={() => { const c = discard.thenClose; setDiscard(null); if (saveEdit() && c) closePanel(); }}>Save changes</button>
          </>} />
      )}
    </>
  );
}

interface PanelProps {
  r: Reorder & { addr1: string; addr2: string };
  status: ReorderStatus;
  visible: Reorder[];
  edit: { id: string; v: EditVals; err: Record<string, string>; tried: boolean; showApt: boolean } | null;
  pTab: 'credential' | 'student'; setPTab: (t: 'credential' | 'student') => void;
  pView: 'details' | 'activity'; setPView: (v: 'details' | 'activity') => void;
  pMenu: boolean; setPMenu: (o: boolean) => void;
  log: ActivityItem[]; denyReason: string;
  onClose: () => void; onNav: (id: string) => void; onAsk: (k: 'approve' | 'deny') => void; onEdit: (tab?: 'student') => void;
  onExport: () => void; onArchive: () => void; setField: (k: string, v: string) => void; onAddApt: () => void; onSave: () => void; onCancel: () => void;
}

function ReorderPanel(p: PanelProps) {
  const { r, status, edit, pTab } = p;
  const idx = p.visible.findIndex((x) => x.id === r.id); const n = p.visible.length;
  const stKey = status === 'denied' && r.expired ? 'expired' : status;
  const [stLabel, stBadge] = STATUS_BADGE[stKey];
  const pm = PAY_META[r.payment]; const ps = PAY_META[r.payState];
  const isAct = p.pView === 'activity' && !edit;
  const cred = pTab === 'credential';
  const err = edit?.tried ? edit.err : {};
  const ek = Object.keys(err);
  const credDot = ek.some((k) => CRED_KEYS.includes(k)); const studDot = ek.some((k) => !CRED_KEYS.includes(k));

  const field = (key: string, label: string, kind: 'text' | 'date' | 'select' | 'area', opts?: { req?: boolean; options?: string[] }) => {
    const req = opts?.req ?? kind !== 'area';
    const id = 'ro-ed-' + key; const e = err[key];
    const v = edit?.v[key] ?? '';
    const common = { id, className: 'cc-input', 'aria-invalid': !!e || undefined, 'aria-describedby': e ? `ro-err-${key}` : undefined, 'aria-required': req || undefined };
    return (
      <div className="cc-field" key={key}>
        <label className="cc-label" htmlFor={id}>{label}{req && <span className={s.req} aria-hidden="true"> *</span>}</label>
        {kind === 'text' && <input {...common} type="text" value={v} onChange={(x) => p.setField(key, x.target.value)} />}
        {kind === 'date' && <input {...common} type="date" value={v} onChange={(x) => p.setField(key, x.target.value)} />}
        {kind === 'select' && (
          <select {...common} value={v} onChange={(x) => p.setField(key, x.target.value)}>
            <option value="">Select…</option>
            {opts?.options?.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
        )}
        {kind === 'area' && <>
          <textarea id={id} className="cc-input" rows={4} maxLength={500} value={v} aria-describedby={`${id}-count`} onChange={(x) => p.setField(key, x.target.value.slice(0, 500))} />
          <p id={`${id}-count`} className={s.counter} aria-live="polite">{500 - v.length}/500 characters remaining</p>
        </>}
        {e && <p id={`ro-err-${key}`} className={s.err}>{e}</p>}
      </div>
    );
  };
  const locked = (label: string, value: string, badge?: string) => (
    <div className="cc-field" key={label}>
      <span className="cc-label">{label}</span>
      <div className={s.locked} aria-readonly="true">
        {badge !== undefined ? <span className={`cc-badge cc-badge--square ${badge}`}>{value}</span> : <span>{value}</span>}
        <Lock size={16} role="img" aria-label="Can't be edited" />
      </div>
    </div>
  );

  const footer = edit ? (
    <>
      <button type="button" className="cc-btn cc-btn--secondary" onClick={p.onCancel}>Cancel</button>
      <button type="button" className="cc-btn cc-btn--primary" onClick={p.onSave}>Save all changes</button>
    </>
  ) : (
    <div className={s.foot}>
      <button type="button" className="cc-icon-btn" aria-label="Previous reorder" aria-disabled={idx <= 0} onClick={() => idx > 0 && p.onNav(p.visible[idx - 1].id)}><ChevronLeft size={20} aria-hidden="true" /></button>
      <button type="button" className="cc-icon-btn" aria-label="Next reorder" aria-disabled={idx < 0 || idx >= n - 1} onClick={() => idx > -1 && idx < n - 1 && p.onNav(p.visible[idx + 1].id)}><ChevronRight size={20} aria-hidden="true" /></button>
      <span role="status" className={s.pos}>{idx > -1 ? `${idx + 1} of ${n}` : ''}</span>
      {status === 'pending' && (
        <div className={s.footEnd}>
          <button type="button" className="cc-btn cc-btn--destructive-secondary" onClick={() => p.onAsk('deny')}>Deny</button>
          <button type="button" className="cc-btn cc-btn--primary" onClick={() => p.onAsk('approve')}>Approve</button>
        </div>
      )}
    </div>
  );

  return (
    <Drawer title={edit ? 'Edit Reorder Details' : 'Reorder Details'} subtitle={`${r.name} - ${r.indId}`} onClose={p.onClose} footer={footer}>
      {!edit && (
        <div className={s.panelHeadActions} style={{ marginBottom: 'var(--space-4)' }}>
          {!isAct && (status === 'pending' || status === 'approved') && <button type="button" className="cc-btn cc-btn--secondary cc-btn--sm" onClick={() => p.onEdit()}>Edit</button>}
          <PopMenu label="Reorder actions" open={p.pMenu} setOpen={p.setPMenu}
            trigger={(t) => <button {...t} type="button" className="cc-icon-btn" aria-label="More reorder actions"><MoreVertical size={20} aria-hidden="true" /></button>}>
            <MenuItem icon={<History />} onClick={() => p.setPView('activity')}>Activity</MenuItem>
            <MenuItem icon={<Upload />} onClick={p.onExport}>Export</MenuItem>
          </PopMenu>
        </div>
      )}
      {isAct ? (
        <>
          <div className={s.backRow}>
            <button type="button" className="cc-icon-btn" aria-label="Back to reorder details" onClick={() => p.setPView('details')}><ArrowLeft size={20} aria-hidden="true" /></button>
            <h3 className={s.h3}>Activity</h3>
          </div>
          <ActivityList items={p.log} emptyText="Edits, approvals and denials on this reorder appear here." />
        </>
      ) : (
        <>
          <div role="tablist" aria-label="Reorder details" className={s.panelTabs}>
            <button type="button" role="tab" aria-selected={cred} className={s.panelTab} onClick={() => p.setPTab('credential')}>
              Credential{credDot && <><span className={s.errDot} aria-hidden="true" /><span className="sr-only">, has errors</span></>}
            </button>
            <button type="button" role="tab" aria-selected={!cred} className={s.panelTab} onClick={() => p.setPTab('student')}>
              Student{studDot && <><span className={s.errDot} aria-hidden="true" /><span className="sr-only">, has errors</span></>}
            </button>
          </div>
          <div role="tabpanel">
            {!edit && cred && (
              <>
                <div className={s.statusBox}>
                  <div className={s.statusHead}><h3 className={s.h3}>Reorder Status</h3><span className={`cc-badge cc-badge--square ${stBadge}`}>{stLabel}</span></div>
                  <p className={s.meta}><GraduationCap size={16} aria-hidden="true" />Conferral date on {r.conferral}</p>
                  <p className={s.meta}><Clock size={16} aria-hidden="true" />Order expires on {r.expires}</p>
                </div>
                <dl className={s.dl}>
                  <div><dt>Product Type</dt><dd>{r.product}</dd></div>
                  <div><dt>Order Reason</dt><dd>{r.reason}</dd></div>
                  <div><dt>Requested Name</dt><dd>{r.requestedName}</dd></div>
                  <div><dt>Credential</dt><dd>{r.credential}</dd></div>
                  <div><dt>Major</dt><dd>{r.major}</dd></div>
                  <div><dt>Payment Status</dt><dd><span className={`cc-badge cc-badge--square ${pm.badge}`}>{pm.label}</span></dd></div>
                  {!r.expired && <div><dt>Payment State</dt><dd><span className={`cc-badge cc-badge--square ${ps.badge}`}>{ps.label}</span></dd></div>}
                </dl>
                {status === 'denied' && !r.expired && <div className={s.section}><h3 className={s.h3}>Reason for denial</h3><p className={s.p}>{p.denyReason}</p></div>}
                <div className={s.section}><h3 className={s.h3}>Internal Notes</h3><p className={s.p}>{r.note || 'No internal notes.'}</p></div>
              </>
            )}
            {!edit && !cred && (
              <>
                <dl className={s.dl}>
                  <div><dt>Name</dt><dd>{r.name}</dd></div>
                  <div><dt>Individual ID</dt><dd>{r.indId}</dd></div>
                  <div><dt>Phone</dt><dd>{r.phone}</dd></div>
                  <div><dt>Date of Birth</dt><dd>{r.dob}</dd></div>
                  <div><dt>Email</dt><dd>{r.email}</dd></div>
                  <div><dt>Comment</dt><dd>{r.comment}</dd></div>
                  <div><dt>Shipping Method</dt><dd>{r.shipMethod}</dd></div>
                </dl>
                <div className={s.section}>
                  <h3 className={s.h3}>Shipping</h3>
                  <div className={s.addr}>
                    <p className={s.addrName}>{r.name}</p>
                    <p className={s.p}>{r.addr1}<br />{r.addr2}</p>
                    <div className={s.addrLinks}>
                      <button type="button" className="cc-link-btn cc-link cc-link--muted" onClick={p.onArchive}>Archive</button>
                      <button type="button" className="cc-link-btn cc-link" onClick={() => p.onEdit('student')}>Edit</button>
                    </div>
                  </div>
                </div>
              </>
            )}
            {edit && (
              <div id="ro-edit" className={s.form}>
                <div role="status" aria-live="polite">
                  {ek.length > 0 && <div className="cc-alert cc-alert--warning"><AlertCircle className="cc-alert__icon" aria-hidden="true" /><div className="cc-alert__body">{ek.length === 1 ? 'Fix 1 field to save.' : `Fix ${ek.length} fields to save.`}</div></div>}
                </div>
                {cred ? (
                  <>
                    <div className={s.statusHead}><h3 className={s.h3}>Reorder Status</h3><span className={`cc-badge cc-badge--square ${stBadge}`}>{stLabel}</span></div>
                    {field('conferralIso', 'Conferral date', 'date')}
                    {locked('Expiration date', r.expires)}
                    {locked('Product type', r.product)}
                    {field('reason', 'Order reason', 'select', { options: ['Lost', 'Damaged', 'Name change', 'Other'] })}
                    {field('requestedName', 'Requested name', 'text')}
                    {field('credential', 'Credential', 'text')}
                    {field('major', 'Major', 'text')}
                    {locked('Payment status', ps.label, ps.badge)}
                    {field('note', 'Internal notes', 'area')}
                  </>
                ) : (
                  <>
                    {field('name', 'Name', 'text')}
                    {field('indId', 'Individual ID', 'text', { req: false })}
                    {field('phone', 'Phone', 'text')}
                    {locked('Date of birth', r.dob)}
                    {field('email', 'Email', 'text')}
                    {field('comment', 'Comment', 'area')}
                    {locked('Shipping method', r.shipMethod)}
                    {field('deliveryName', 'Delivery name', 'text')}
                    {field('country', 'Country', 'select', { options: ['United States', 'Canada', 'Mexico', 'United Kingdom'] })}
                    {field('street', 'Address', 'text')}
                    {edit.showApt && field('apt', 'Address 2', 'text', { req: false })}
                    {field('city', 'City', 'text')}
                    {field('state', 'State/Province', 'select', { options: ['Massachusetts', 'New York', 'California', 'Texas', 'Illinois', 'Ontario'] })}
                    {field('zip', 'Zip code', 'text')}
                    {!edit.showApt && <button type="button" className="cc-link-btn cc-link" style={{ alignSelf: 'flex-start', display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }} onClick={p.onAddApt}><Plus size={16} aria-hidden="true" />Add address 2</button>}
                  </>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </Drawer>
  );
}
