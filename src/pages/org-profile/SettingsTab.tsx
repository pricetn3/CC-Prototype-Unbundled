/* Org profile › Settings (the prototype's OrgSettingsV3, Version 6, embedded): a side rail of sections with
   their status, and one section at a time in view or edit mode. Saving appends Admin › Action log entries. */

import { useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { CalendarClock, FileText, FileX2, Monitor, PauseCircle, RefreshCw, ShoppingBag } from 'lucide-react';
import type { Org } from '../../data/orgs';
import { CURRENT_USER, useStore } from '../../data/store';
import { logEntry, type LogEntry } from '../../data/actionLog';
import { PACKAGING, seedSettings, stampNow, type OrgSettings } from '../../data/orgProfile';
import { useToast } from '../../components/Toast';
import s from './OrgTabs.module.css';
import st from './SettingsTab.module.css';

type SecKey = 'batch' | 'ced' | 'hold' | 'ld' | 'display' | 'reorder' | 'store';
type Vals = Record<string, unknown>;
type Opt = [string, string, string?];

interface Row {
  f: string; label: string; type: 'text' | 'radio' | 'money' | 'check' | 'date' | 'upload' | 'checks' | 'select' | 'email' | 'fixed';
  req?: boolean; opt?: boolean; help?: string; editHelp?: boolean; ph?: string; options?: Opt[]; checkLabel?: string;
  uploadLabel?: string; max?: number; fixed?: string; when?: (v: Vals) => boolean;
}
interface Group { title: string; rows: Row[]; certs?: boolean }
interface SecDef { key: SecKey; label: string; desc: string; toggle?: string; paper?: boolean; groups: Group[]; icon: typeof FileText }

const HD: Opt[] = [['Mon', 'Monday'], ['Tue', 'Tuesday'], ['Wed', 'Wednesday'], ['Thu', 'Thursday'], ['Fri', 'Friday']];
const ord = (n: number) => n + (n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th');
const MD: Opt[] = Array.from({ length: 28 }, (_, i) => [String(i + 1), ord(i + 1)]);
const FREQ: Opt[] = [['daily', 'Daily (Monday–Friday)'], ['weekly', 'Weekly'], ['twice', 'Twice a week'], ['monthly', 'Monthly']];
const sched = (help: string | undefined, monthHelp: string): Row[] => [
  { f: 'freq', label: 'Batch frequency', help, type: 'radio', req: true, options: FREQ },
  { f: 'weekly', label: 'Batch day', help: 'Select 1 day.', editHelp: true, type: 'radio', req: true, options: HD, when: (v) => v.freq === 'weekly' },
  { f: 'twice', label: 'Batch days', help: 'Select 2 days.', type: 'checks', req: true, max: 2, options: HD, when: (v) => v.freq === 'twice' },
  { f: 'monthDay', label: 'Day of the month', help: monthHelp, type: 'select', req: true, options: MD, when: (v) => v.freq === 'monthly' },
];

// Alphabetical: every settings section carries equal weight.
const DEFS: SecDef[] = [
  { key: 'batch', icon: CalendarClock, label: 'API order batching', desc: 'When API orders are batched for this organization. Universal API batches run at 1:00 PM ET, for both standard and rush orders.', toggle: 'Batches this organization\'s API orders on a schedule.', groups: [
    { title: 'Standard orders', rows: sched(undefined, 'Runs on this date, including weekends.') },
    { title: 'Rush orders', rows: [{ f: '_rush', label: 'Batch frequency', help: '5-day, 3-day and 1-day orders. Set by Paradigm.', type: 'fixed', fixed: 'Daily (Monday–Friday)' }] }] },
  { key: 'ced', icon: Monitor, label: 'Digital credentials', desc: 'CeD/CeC purchase option, authentication, pricing and domain.', toggle: 'Offers digital diplomas and certificates (CeD/CeC).', groups: [
    { title: 'Digital pricing', rows: [
      { f: 'purchase', label: 'Purchase option', type: 'radio', req: true, options: [['student', 'Student purchase', 'Students buy their own CeD/CeC at the student purchase price.'], ['buyall', 'Buy all', 'The institution buys every credential. Students aren’t charged.']] },
      { f: 'price', label: 'Student purchase price', help: 'What students pay for each digital credential in the Student Store.', type: 'money', req: true, ph: '14.95', when: (v) => v.purchase === 'student' }] },
    { title: 'Access', rows: [
      { f: 'auth', label: 'Student sign-in', help: 'How students sign in to the Student Store.', type: 'radio', req: true, options: [['sso', 'SSO'], ['email', 'Email']] },
      { f: 'domain', label: 'Domain', help: 'Leave out http:// and www.', editHelp: true, type: 'text', req: true, ph: 'school.edu' },
      { f: 'subdomain', label: 'Subdomain', opt: true, help: 'Only the part before the domain. For sub.school.edu, enter sub.', type: 'text', ph: 'credentials' }] },
    { title: 'Program', rows: [
      { f: 'start', label: 'Start date', type: 'date' },
      { f: 'cedOnly', label: 'CeD/CeC only', help: 'Paper Credentials and Lost & Damaged stay off.', type: 'check', checkLabel: 'This organization has no paper products.' },
      { f: 'page2', label: 'Separate page 2 for CeC', type: 'check', checkLabel: 'The CeC includes a separate second page.' },
      { f: 'legacy', label: 'Legacy CeD', help: 'For credentials with a conferral date before the start date.', type: 'check', checkLabel: 'Legacy CeD' }] },
    { title: 'Tracking', rows: [
      { f: 'contracts', label: 'Contracts added to repository', type: 'date' },
      { f: 'internalEmail', label: 'Internal email sent', type: 'date' }] },
    { title: 'Images', rows: [
      { f: 'logos', label: 'Logos', type: 'upload', uploadLabel: 'Upload logo' },
      { f: 'diplomas', label: 'Diploma images', type: 'upload', uploadLabel: 'Upload diploma image' }] }] },
  { key: 'hold', icon: PauseCircle, label: 'Hold Management', desc: 'Hold batching frequency and notification email.', toggle: 'Batches orders on hold on a schedule.', groups: [
    { title: 'Schedule', rows: sched('Batched only when 6 or more documents are on hold. Otherwise they wait for the next batch date.', 'Batching is due on this date, including weekends and holidays.') },
    { title: 'Notifications', rows: [{ f: 'emails', label: 'Email', help: 'Receives batch order notifications and alerts when records on hold are expiring soon.', type: 'email', req: true, ph: 'name@school.edu' }] }] },
  // Its own section: a school can offer replacements without paper ordering in the store (students then contact the school).
  { key: 'ld', icon: FileX2, paper: true, label: 'Lost & Damaged', desc: 'Replacements for lost or damaged paper credentials.', toggle: 'Offers replacements for lost or damaged paper credentials.', groups: [
    { title: 'Student Store', rows: [
      { f: 'report', label: 'Student reporting', help: 'Reports become paper replacement orders automatically.', type: 'check', checkLabel: 'Students can report lost or damaged credentials in the Student Store.', when: (v) => !!v._paperOn },
      { f: '_report', label: 'Student reporting', help: 'Students contact the organization to request a replacement. Turn on Paper Credentials to let them report in the Student Store.', type: 'fixed', fixed: 'Off', when: (v) => !v._paperOn }] }] },
  { key: 'display', icon: FileText, label: 'Paper authentication', desc: 'The organization display name shown on the Paper Authentication Page.', groups: [
    { title: 'Organization', rows: [{ f: 'name', label: 'Display name', type: 'text', req: true, max: 256, ph: 'e.g. Organization name' }] }] },
  { key: 'reorder', icon: RefreshCw, label: 'Reorder Management', desc: 'Student reorder site domain and images.', toggle: 'Lets students request reorders.', groups: [
    { title: 'Student site', rows: [
      { f: 'domain', label: 'Domain', help: 'Leave out http:// and www.', editHelp: true, type: 'text', req: true, ph: 'school.edu' },
      { f: 'subdomain', label: 'Subdomain', opt: true, help: 'Only the part before the domain. For sub.school.edu, enter sub.', type: 'text', ph: 'reorder' }] },
    { title: 'Images', rows: [{ f: 'logos', label: 'Logos', help: 'JPG or PNG only.', type: 'upload', req: true, uploadLabel: 'Upload logo' }] }] },
  { key: 'store', icon: ShoppingBag, paper: true, label: 'Paper credentials', desc: 'Paper ordering in the Student Store, pricing and cert type packaging.', toggle: 'Students can order paper credentials in the Student Store.', groups: [
    { title: 'Paper pricing', rows: [
      { f: 'first', label: 'First paper product price', type: 'money', req: true, ph: '0.00' },
      { f: 'additional', label: 'Additional paper product price', type: 'money', req: true, ph: '0.00' },
      { f: 'applies', label: 'Additional price applies', type: 'radio', req: true, options: [['certtype', 'Per cert type (Recommended)', 'The first item of each cert type gets the first price; more of that type get the additional price.'], ['cart', 'Per cart', 'Every item after the first in the cart gets the additional price.']] }] },
    { title: 'Cert types', certs: true, rows: [] }] },
];

// ?section= deep links, same names as the design's (for user stories).
const SECTION_LINKS: Record<string, SecKey> = {
  paper: 'store', 'paper-credentials': 'store', store: 'store', 'student-store': 'store', 'lost-damaged': 'ld', ld: 'ld',
  'display-name': 'display', display: 'display', 'paper-authentication': 'display', batching: 'batch', batch: 'batch',
  ced: 'ced', digital: 'ced', 'digital-credentials': 'ced', reorder: 'reorder', reorders: 'reorder', hold: 'hold', holds: 'hold',
};

type Status = 'done' | 'off' | 'todo';
const NO_PAPER = 'This organization is CeD/CeC only. Change it in Digital Credentials.';
const statusOf = (k: SecKey, d: OrgSettings): Status => {
  if ((k === 'store' || k === 'ld') && d.ced.cedOnly) return 'off';
  if (k === 'display') return d.display.name.trim() ? 'done' : 'todo';
  return d[k].on ? 'done' : 'off';
};
const statusLabel = (k: SecKey, x: Status) =>
  k === 'display' ? (x === 'done' ? 'Set up' : 'Needs setup') : k === 'batch' ? (x === 'done' ? 'Scheduled' : 'Not set') : x === 'done' ? 'On' : 'Off';

// Saved settings live for the session (until reload), per organization.
const saved = new Map<string, OrgSettings>();

const DOMAIN_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i;
const vis = (r: Row, v: Vals) => !r.when || r.when(v);
const str = (x: unknown) => (x == null ? '' : String(x));

function rowErr(r: Row, v: Vals): string {
  const x = v[r.f];
  if ((r.f === 'domain' || r.f === 'subdomain') && str(x).trim()) {
    const d = str(x).trim();
    if (/^[a-z]+:\/\//i.test(d) || /[\s/]/.test(d)) return r.f === 'domain' ? 'Enter the domain only, like school.edu, without http:// or spaces.' : 'Enter the subdomain only, like reorder, without http:// or spaces.';
    if (r.f === 'domain' ? !DOMAIN_RE.test(d) : !/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/i.test(d)) return r.f === 'domain' ? 'Enter a valid domain, like school.edu.' : 'Use only letters, numbers and hyphens, like reorder.';
  }
  if (!r.req || !vis(r, v)) return '';
  if (r.type === 'upload') return Number(x) > 0 ? '' : 'Upload at least one logo.';
  if (r.type === 'checks') return ((x as string[]) ?? []).length === (r.max ?? 1) ? '' : `Select exactly ${r.max ?? 1} days.`;
  if (r.type === 'email') { const e = str(x).trim(); if (!e) return 'Enter an email address, like name@school.edu.'; return /^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+$/.test(e) ? '' : 'Enter a valid email address, like name@school.edu.'; }
  if (r.type === 'money') return /^\d+(\.\d{1,2})?$/.test(str(x).trim()) && parseFloat(str(x)) > 0 ? '' : 'Enter a price, like 45.00.';
  if (r.f === 'weekly' && !str(x).trim()) return 'Select a day.';
  if (!str(x).trim()) return r.type === 'radio' || r.type === 'select' ? 'Select an option.' : `Enter a ${r.label.toLowerCase()}.`;
  if (r.max && str(x).trim().length > r.max) { const o = str(x).trim().length - r.max; return `${o} ${o === 1 ? 'character' : 'characters'} too many. Use ${r.max} or fewer.`; }
  return '';
}

const fmtDate = (iso: string) => { const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso); return m ? `${m[2]}/${m[3]}/${m[1]}` : ''; };
const dayName = (d: string) => HD.find((o) => o[0] === d)?.[1] ?? d;
function freqText(v: Vals) {
  const f = str(v.freq);
  if (f === 'daily') return 'Daily (Monday–Friday)';
  if (f === 'weekly') return v.weekly ? `Weekly on ${dayName(str(v.weekly))}` : 'Weekly';
  if (f === 'twice') return `Twice a week on ${((v.twice as string[]) ?? []).map(dayName).join(', ')}`;
  if (f === 'monthly') return v.monthDay ? `Monthly on the ${ord(Number(v.monthDay))}` : 'Monthly';
  return '';
}
const pkgLabel = (p: string | null) => { const o = PACKAGING.find((x) => x[0] === p); return o ? (o[2] ? `${o[1]} (${o[2]} in)` : o[1]) : ''; };

function viewValue(r: Row, v: Vals): string {
  const x = v[r.f];
  switch (r.type) {
    case 'fixed': return r.fixed ?? '';
    case 'radio': return r.f === 'freq' ? FREQ.find((o) => o[0] === x)?.[1] ?? '—' : r.options?.find((o) => o[0] === x)?.[1] ?? '—';
    case 'select': return r.options?.find((o) => o[0] === x)?.[1] ?? '—';
    case 'money': return str(x) ? '$' + Number(x).toFixed(2) : '—';
    case 'check': return x ? 'On' : 'Off';
    case 'date': return fmtDate(str(x)) || '—';
    case 'upload': return Number(x) ? `${x} ${Number(x) === 1 ? 'file' : 'files'}` : 'None';
    case 'checks': return ((x as string[]) ?? []).map(dayName).join(', ') || '—';
    default: return str(x).trim() || '—';
  }
}

/** Action log entries for the fields that changed, named like the prototype's implLogEntry. */
function logEntries(org: Org, k: SecKey, prev: Vals, next: Vals): LogEntry[] {
  const at = stampNow();
  const L = (type: string, field: string, p: string, n: string) => (p === n ? null : logEntry(at, CURRENT_USER.name, String(org.num), org.name, type, field, p, n));
  const onOff = (b: unknown) => (b ? 'On' : 'Off');
  const out: (LogEntry | null)[] = [];
  if (k === 'display') out.push(L('Display name', 'Display name', str(prev.name), str(next.name)));
  if (k === 'batch' || k === 'hold') {
    const type = k === 'batch' ? 'API order batching' : 'Hold Management';
    const fq = (v: Vals) => (v.on ? freqText(v) : 'Off');
    out.push(L(type, 'Batch frequency', fq(prev), fq(next)));
    if (k === 'hold') out.push(L(type, 'Email', str(prev.emails), str(next.emails)));
  }
  if (k === 'reorder') {
    out.push(L('Reorder Management', 'Domain', str(prev.domain), str(next.domain)));
    out.push(L('Reorder Management', 'Subdomain', str(prev.subdomain), str(next.subdomain)));
    out.push(L('Reorder Management', 'Logos', str(prev.logos || ''), str(next.logos || '')));
  }
  if (k === 'ced') {
    const def = DEFS.find((d) => d.key === 'ced')!;
    out.push(L('Digital credentials', 'Purchase option', onOff(prev.on) === 'Off' ? 'Off' : viewValue(def.groups[0].rows[0], prev), onOff(next.on) === 'Off' ? 'Off' : viewValue(def.groups[0].rows[0], next)));
    def.groups.flatMap((g) => g.rows).filter((r) => r.f !== 'purchase').forEach((r) => {
      const name = r.f === 'price' ? 'Student purchase price' : r.f === 'diplomas' ? 'Diploma images' : r.label;
      out.push(L('Digital credentials', name, viewValue(r, prev), viewValue(r, next)));
    });
  }
  if (k === 'store') {
    out.push(L('Paper ordering', 'Paper credential ordering', onOff(prev.on), onOff(next.on)));
    const money = (x: unknown) => (str(x) ? '$' + Number(x).toFixed(2) : '');
    out.push(L('Paper product pricing', 'First paper product price', money(prev.first), money(next.first)));
    out.push(L('Paper product pricing', 'Additional paper product price', money(prev.additional), money(next.additional)));
    const ap = (x: unknown) => (x === 'cart' ? 'Per cart' : 'Per cert type');
    out.push(L('Paper product pricing', 'Additional price applies', ap(prev.applies), ap(next.applies)));
    const pc = (prev.certs as OrgSettings['store']['certs']) ?? [];
    ((next.certs as OrgSettings['store']['certs']) ?? []).forEach((c, i) => {
      out.push(L('Cert types', 'Cert type description: ' + c.type, pc[i]?.desc ?? '', c.desc));
      out.push(L('Cert types', 'Cert type packaging: ' + c.type, pkgLabel(pc[i]?.pkg ?? null), pkgLabel(c.pkg)));
    });
  }
  if (k === 'ld') {
    out.push(L('Lost & Damaged', 'Lost & Damaged', onOff(prev.on), onOff(next.on)));
    out.push(L('Lost & Damaged', 'Student reporting', onOff(prev.on && prev.report), onOff(next.on && next.report)));
  }
  return out.filter((e): e is LogEntry => !!e);
}

export function SettingsTab({ org }: { org: Org }) {
  const { addLog } = useStore();
  const toast = useToast();
  const [data, setDataState] = useState<OrgSettings>(() => saved.get(org.id) ?? seedSettings(org));
  const setData = (d: OrgSettings) => { saved.set(org.id, d); setDataState(d); };
  const [params] = useSearchParams();
  const [sec, setSec] = useState<SecKey>(() => SECTION_LINKS[params.get('section') ?? ''] ?? 'batch');
  const [draft, setDraft] = useState<Vals | null>(null);
  const [tried, setTried] = useState(false);
  const inactive = org.status === 'inactive';

  const statuses = Object.fromEntries(DEFS.map((d) => [d.key, statusOf(d.key, data)])) as Record<SecKey, Status>;
  const counts = { done: 0, off: 0, todo: 0 };
  DEFS.forEach((d) => counts[statuses[d.key]]++);

  const def = DEFS.find((d) => d.key === sec)!;
  const cur = { ...(data[sec] as unknown as Vals), _paperOn: data.store.on };
  const v: Vals = draft ?? cur;
  const editing = !!draft;
  const blocked = def.paper && data.ced.cedOnly ? NO_PAPER : '';
  const isOn = sec === 'display' ? true : !!v.on && !blocked;

  const errs: Record<string, string> = {};
  const certErrs: Record<number, { desc?: string; pkg?: string }> = {};
  if (editing && tried && isOn) {
    def.groups.forEach((g) => g.rows.forEach((r) => { const e = rowErr(r, v); if (e) errs[r.f] = e; }));
    if (sec === 'store') ((v.certs as OrgSettings['store']['certs']) ?? []).forEach((c, i) => {
      const r: { desc?: string; pkg?: string } = {};
      if (!c.desc.trim()) r.desc = 'Add a description.'; else if (c.desc.length > 300) r.desc = 'Use 300 characters or fewer.';
      if (!c.pkg) r.pkg = 'Select packaging.';
      if (r.desc || r.pkg) certErrs[i] = r;
    });
  }

  const open = (k: SecKey) => { if (editing) return; setSec(k); };
  const startEdit = () => { setDraft(JSON.parse(JSON.stringify(cur))); setTried(false); };
  const cancel = () => { setDraft(null); setTried(false); };
  const set = (f: string, x: unknown) => setDraft({ ...(draft as Vals), [f]: x });
  const save = () => {
    if (!draft) return;
    setTried(true);
    let bad = false;
    if (isOn) {
      def.groups.forEach((g) => g.rows.forEach((r) => { if (rowErr(r, draft)) bad = true; }));
      if (sec === 'store') ((draft.certs as OrgSettings['store']['certs']) ?? []).forEach((c) => { if (!c.desc.trim() || c.desc.length > 300 || !c.pkg) bad = true; });
    }
    if (bad) return;
    const next = { ...draft };
    delete next._paperOn;
    if (typeof next.first === 'string' && next.first) next.first = Number(next.first).toFixed(2);
    if (typeof next.additional === 'string' && next.additional) next.additional = Number(next.additional).toFixed(2);
    if (typeof next.price === 'string' && next.price) next.price = Number(next.price).toFixed(2);
    addLog(logEntries(org, sec, cur, next));
    setData({ ...data, [sec]: next } as OrgSettings);
    setDraft(null);
    setTried(false);
    toast(`Successfully updated ${def.label}`, 'Your changes have been saved.');
  };

  const Icon = def.icon;
  const sumText = `${counts.done} on · ${counts.off} off${counts.todo ? ` · ${counts.todo} incomplete` : ''}`;

  return (
    <div>
      <div className={st.intro}>
        <p className={s.sub} style={{ marginTop: 0 }}>All changes are recorded in the Action log for reference.</p>
        <p className={st.summary} style={{ color: counts.todo ? 'var(--warning-700)' : 'var(--gray-600)' }}>{sumText}</p>
      </div>

      <div className={st.grid}>
        <nav aria-label="Settings sections" className={st.rail}>
          {DEFS.map((d) => {
            const x = statuses[d.key];
            return (
              <button
                key={d.key} type="button" className={st.navItem} aria-current={d.key === sec ? 'true' : undefined}
                aria-disabled={editing && d.key !== sec ? true : undefined} title={editing && d.key !== sec ? 'Save or cancel your changes first' : undefined}
                onClick={() => open(d.key)}
              >
                <span className={`${st.dot} ${x === 'done' ? st.dotOn : x === 'todo' ? st.dotTodo : st.dotOff}`} aria-hidden="true" />
                <span style={{ flex: 1, minWidth: 0 }}>{d.label}<span className="sr-only">, {statusLabel(d.key, x)}</span></span>
              </button>
            );
          })}
        </nav>

        <section aria-labelledby="v2-title" style={{ minWidth: 0 }}>
          <div className={st.shead}>
            <div className={st.sheadMain}>
              <span className={st.ficon} aria-hidden="true"><Icon size={20} /></span>
              <div style={{ minWidth: 0 }}>
                <div className={st.titleRow}>
                  <h2 id="v2-title" className={s.h2}>{def.label}</h2>
                  {/* Sections with an on/off switch show their status in the Status group below, not beside the title. */}
                  {!def.toggle && sec !== 'display' && (
                    <span className={`cc-badge ${statuses[sec] === 'done' ? 'cc-badge--success' : statuses[sec] === 'todo' ? 'cc-badge--warning' : ''}`}>{statusLabel(sec, statuses[sec])}</span>
                  )}
                </div>
                <p className={s.sub}>{def.desc}</p>
              </div>
            </div>
            <div className={st.actions}>
              {editing ? (
                <>
                  <button type="button" className="cc-btn cc-btn--secondary" onClick={cancel}>Cancel</button>
                  <button type="button" className="cc-btn cc-btn--primary" onClick={save}>Save changes</button>
                </>
              ) : blocked ? null : (
                <button type="button" className="cc-btn cc-btn--primary" onClick={inactive ? undefined : startEdit} aria-disabled={inactive} title={inactive ? 'Reactivate this organization to edit it' : undefined}>Edit</button>
              )}
            </div>
          </div>

          {def.toggle && (
            <div className={st.group}>
              <h3 className="cc-setting-group__title">Status</h3>
              <div className="cc-setting-group">
                <div className="cc-setting-row">
                  <div className="cc-setting-row__text">
                    <span id="v2-on-label" className="cc-setting-row__label">{def.label}</span>
                    <p id="v2-on-help" className="cc-setting-row__help">{blocked || def.toggle}</p>
                  </div>
                  <div className="cc-setting-row__control">
                    {editing && !blocked ? (
                      <span className="cc-switch-label">
                        <button type="button" role="switch" className="cc-switch" aria-checked={!!v.on} aria-labelledby="v2-on-label" aria-describedby="v2-on-help" onClick={() => set('on', !v.on)} />
                        <span aria-hidden="true">{v.on ? 'On' : 'Off'}</span>
                      </span>
                    ) : (
                      <span className={`cc-badge ${isOn ? 'cc-badge--success' : ''}`}>{isOn ? 'On' : 'Off'}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {isOn && (
            def.groups.map((g) => {
              const rows = g.rows.filter((r) => vis(r, v));
              if (!rows.length && !g.certs) return null;
              return (
                <div key={g.title} className={st.group}>
                  <h3 className="cc-setting-group__title">{g.title}</h3>
                  {g.certs ? (
                    <CertTable certs={(v.certs as OrgSettings['store']['certs']) ?? []} editing={editing} errs={certErrs} onChange={(c) => set('certs', c)} />
                  ) : (
                    <div className="cc-setting-group">
                      {rows.map((r) => <SettingRow key={r.f} r={r} v={v} editing={editing} err={errs[r.f]} set={set} sec={sec} />)}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}

function SettingRow({ r, v, editing, err, set, sec }: { r: Row; v: Vals; editing: boolean; err?: string; set: (f: string, x: unknown) => void; sec: SecKey }) {
  const id = `set-${sec}-${r.f}`;
  const errId = id + '-err';
  const helpText = r.help || (r.type === 'check' ? r.checkLabel : '');
  const showHelp = helpText && (!r.editHelp || editing);
  const helpId = showHelp ? id + '-help' : undefined;
  const describedBy = [helpId, err ? errId : ''].filter(Boolean).join(' ') || undefined;
  const x = v[r.f];
  const canEdit = editing && r.type !== 'fixed';

  let control: ReactNode;
  if (!canEdit) {
    control = <div className="cc-setting-row__value">{viewValue(r, v)}</div>;
  } else if (r.type === 'radio') {
    const inline = (r.options ?? []).every((o) => !o[2]) && r.f !== 'freq';
    control = (
      <div role="radiogroup" aria-labelledby={id + '-label'} aria-describedby={describedBy} className={inline ? st.radioInline : st.radioStack}>
        {(r.options ?? []).map((o) => (
          <label key={o[0]} className="cc-radio">
            <input className="cc-radio__input" type="radio" name={id} checked={x === o[0]} onChange={() => set(r.f, o[0])} />
            <span>{o[1]}{o[2] && <span className={st.optHelp}>{o[2]}</span>}</span>
          </label>
        ))}
      </div>
    );
  } else if (r.type === 'checks') {
    const sel = (x as string[]) ?? [];
    control = (
      <div role="group" aria-labelledby={id + '-label'} aria-describedby={describedBy} className={st.radioInline}>
        {(r.options ?? []).map((o) => {
          const on = sel.includes(o[0]);
          return (
            <label key={o[0]} className="cc-checkbox">
              <input className="cc-checkbox__input" type="checkbox" checked={on} disabled={!on && sel.length >= (r.max ?? 2)}
                onChange={() => set(r.f, on ? sel.filter((d) => d !== o[0]) : HD.map((h) => h[0]).filter((d) => d === o[0] || sel.includes(d)))} />
              {o[1]}
            </label>
          );
        })}
      </div>
    );
  } else if (r.type === 'check') {
    // V6: yes/no settings are switches; what the switch does is the row's help text.
    control = (
      <span className="cc-switch-label">
        <button type="button" role="switch" className="cc-switch" aria-checked={!!x} aria-labelledby={id + '-label'} aria-describedby={describedBy} onClick={() => set(r.f, !x)} />
        <span aria-hidden="true">{x ? 'On' : 'Off'}</span>
      </span>
    );
  } else if (r.type === 'select') {
    control = (
      <select id={id} className="cc-input" value={str(x)} onChange={(e) => set(r.f, e.target.value)} aria-invalid={!!err} aria-describedby={describedBy}>
        <option value="">Select a day</option>
        {(r.options ?? []).map((o) => <option key={o[0]} value={o[0]}>{o[1]}</option>)}
      </select>
    );
  } else if (r.type === 'upload') {
    const n = Number(x) || 0;
    control = (
      <div className={st.upload}>
        <span className="cc-setting-row__value">{n ? `${n} ${n === 1 ? 'file' : 'files'}` : 'None'}</span>
        <span style={{ display: 'flex', gap: 'var(--space-2)' }}>
          {n > 0 && <button type="button" className="cc-btn cc-btn--tertiary cc-btn--sm" onClick={() => set(r.f, n - 1)}>Remove one</button>}
          <button type="button" className="cc-btn cc-btn--secondary cc-btn--sm" onClick={() => set(r.f, n + 1)} aria-describedby={describedBy}>{r.uploadLabel}</button>
        </span>
      </div>
    );
  } else {
    const money = r.type === 'money';
    control = (
      <div className={money ? st.money : undefined}>
        {money && <span className={st.moneyPre} aria-hidden="true">$</span>}
        <input
          id={id} className="cc-input" type={r.type === 'date' ? 'date' : r.type === 'email' ? 'email' : 'text'} inputMode={money ? 'decimal' : undefined}
          value={str(x)} placeholder={r.ph} onChange={(e) => set(r.f, money ? e.target.value.replace(/[^0-9.]/g, '') : e.target.value)}
          aria-required={r.req && vis(r, v)} aria-invalid={!!err} aria-describedby={describedBy}
          style={money ? { paddingLeft: 'var(--space-6)' } : undefined}
        />
      </div>
    );
  }

  const labelFor = canEdit && !['radio', 'checks', 'check', 'upload'].includes(r.type) ? id : undefined;
  return (
    <div className="cc-setting-row">
      <div className="cc-setting-row__text">
        <label id={id + '-label'} htmlFor={labelFor} className="cc-setting-row__label">
          {r.label}{editing && r.opt && <span className={st.optTag}> (optional)</span>}
        </label>
        {showHelp && <p id={helpId} className="cc-setting-row__help">{helpText}</p>}
      </div>
      <div className="cc-setting-row__control">
        {control}
        {err && <p id={errId} className="cc-hint cc-hint--error">{err}</p>}
      </div>
    </div>
  );
}

function CertTable({ certs, editing, errs, onChange }: {
  certs: OrgSettings['store']['certs']; editing: boolean; errs: Record<number, { desc?: string; pkg?: string }>;
  onChange: (c: OrgSettings['store']['certs']) => void;
}) {
  const upd = (i: number, p: Partial<OrgSettings['store']['certs'][number]>) => onChange(certs.map((c, j) => (j === i ? { ...c, ...p } : c)));
  return (
    <div className={s.tableWrap} style={{ marginTop: 0 }}>
      <table className={s.table} style={{ minWidth: 640 }}>
        <thead><tr><th style={{ width: 200 }}>Cert type</th><th>Description</th><th style={{ width: 240, textAlign: 'left' }}>Packaging</th></tr></thead>
        <tbody>
          {certs.map((c, i) => {
            const e = errs[i] ?? {};
            const id = 'cert-' + i;
            return (
              <tr key={c.type}>
                <td className={s.strong} style={{ verticalAlign: 'top' }}>{c.type}</td>
                <td style={{ verticalAlign: 'top' }}>
                  {editing ? (
                    <>
                      <textarea className="cc-input" rows={3} style={{ width: '100%', height: 'auto', resize: 'vertical' }} aria-label={'Description for ' + c.type}
                        value={c.desc} onChange={(ev) => upd(i, { desc: ev.target.value })} aria-invalid={!!e.desc} aria-describedby={e.desc ? id + '-d' : undefined} />
                      {e.desc && <p id={id + '-d'} className="cc-hint cc-hint--error">{e.desc}</p>}
                    </>
                  ) : (c.desc || '—')}
                </td>
                <td style={{ verticalAlign: 'top', textAlign: 'left' }}>
                  {editing ? (
                    <>
                      <select className="cc-input" aria-label={'Packaging for ' + c.type} value={c.pkg ?? ''} onChange={(ev) => upd(i, { pkg: ev.target.value || null })}
                        aria-invalid={!!e.pkg} aria-describedby={e.pkg ? id + '-p' : undefined}>
                        <option value="">Select packaging</option>
                        {PACKAGING.map((o) => <option key={o[0]} value={o[0]}>{o[2] ? `${o[1]} (${o[2].split('×').join(' × ')} in)` : o[1]}</option>)}
                      </select>
                      {e.pkg && <p id={id + '-p'} className="cc-hint cc-hint--error">{e.pkg}</p>}
                    </>
                  ) : (pkgLabel(c.pkg) || 'Needs setup')}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
