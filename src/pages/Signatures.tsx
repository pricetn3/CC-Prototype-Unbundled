/* Signatures: every signature across organizations by period (Current / Past / Inactive). Select a row to show
   its notes; the row menu edits details or previews the signature. "Submit signature" and "Update school name"
   open a full-page form that confirms in a dialog before saving. All changes are in memory. */

import { Fragment, useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type MouseEvent, type ReactNode } from 'react';
import {
  AlertCircle, Check, CheckCircle2, ChevronLeft, ChevronRight, Clock, Eye, Feather, Filter, MoreVertical,
  Paperclip, Pencil, Plus, Trash2, UploadCloud, X,
} from 'lucide-react';
import { CCTable } from '../components/CCTable';
import { PageHeader } from '../components/PageHeader';
import { SearchField } from '../components/SearchField';
import { SegTabs } from '../components/SegTabs';
import { useToast } from '../components/Toast';
import { useDismiss } from '../components/useDismiss';
import { DocsSigOrgPicker, type PickOrg } from '../components/DocsSigOrgPicker';
import { SEED_SIGNATURES, SIG_STATUS, sigFontFor, sigSizeFor, type SigPeriod, type SigStatus, type Signature } from '../data/signatures';
import styles from './Signatures.module.css';

type Mode = 'submit' | 'edit' | 'school';
interface Vals {
  org: string; prefix: string; first: string; middle: string; last: string; suffix: string; title: string; school: string;
  prevSchool: string; newSchool: string; from: string; to: string; untilNotice: boolean; activation: 'immediate' | 'future'; futureDate: string; notes: string;
}
interface SigFile { id: string; name: string; size: number; isImg: boolean; url: string }
interface Form { mode: Mode; editId: string | null; sigName: string; v: Vals; files: SigFile[]; tried: boolean }
interface PreviewItem { label: string; isImg: boolean; url: string; sig: string }
type Dlg = { kind: 'preview'; items: PreviewItem[]; idx: number } | { kind: 'confirm'; warn: boolean; error: boolean; failed: boolean };

const iso = (mdy: string) => { const m = mdy.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/); return m ? `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}` : ''; };
const mdy = (d: string) => { const p = d.split('-'); return p.length === 3 ? `${p[1]}/${p[2]}/${p[0]}` : ''; };
const fullName = (v: Vals) => {
  const n = [v.prefix, v.first, v.middle, v.last].map((x) => x.trim()).filter(Boolean).join(' ');
  return v.suffix.trim() ? `${n}, ${v.suffix.trim()}` : n;
};
const kb = (n: number) => (n >= 1048576 ? (n / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(n / 1024)) + ' KB');

function validate(v: Vals, mode: Mode, files: SigFile[]) {
  const e: Record<string, string> = {};
  const t = (x: string) => x.trim();
  const nameRe = /^[A-Za-zÀ-ÿ' .-]+$/; const shortRe = /^[A-Za-z.]+$/; const textRe = /^[A-Za-z0-9À-ÿ&,.'()/ -]+$/;
  const dateMsg = 'Please enter a valid format (MM/DD/YYYY) or select a date.';
  if (mode === 'submit' && !files.length) e.file = 'Please upload an accepted file.';
  if (!t(v.org)) e.org = 'Please select an organization.';
  if (mode === 'school') {
    if (!t(v.prevSchool)) e.prevSchool = 'Please enter the previous school/college.'; else if (!textRe.test(t(v.prevSchool))) e.prevSchool = 'Please enter a valid school/college.';
    if (!t(v.newSchool)) e.newSchool = 'Please enter the new school/college.'; else if (!textRe.test(t(v.newSchool))) e.newSchool = 'Please enter a valid school/college.';
  } else {
    if (t(v.prefix) && !shortRe.test(t(v.prefix))) e.prefix = 'Please enter a valid prefix.';
    if (!t(v.first)) e.first = 'Please enter a first name.'; else if (!nameRe.test(t(v.first))) e.first = 'Please enter a valid first name.';
    if (t(v.middle) && !nameRe.test(t(v.middle))) e.middle = 'Please enter a valid middle name.';
    if (!t(v.last)) e.last = 'Please enter a last name.'; else if (!nameRe.test(t(v.last))) e.last = 'Please enter a valid last name.';
    if (t(v.suffix) && !shortRe.test(t(v.suffix))) e.suffix = 'Please enter a valid suffix.';
    if (!t(v.title)) e.title = 'Please enter a title.'; else if (!textRe.test(t(v.title))) e.title = 'Please enter a valid title.';
    if (t(v.school) && !textRe.test(t(v.school))) e.school = 'Please enter a valid school/college.';
  }
  if (!t(v.from)) e.from = dateMsg;
  if (!v.untilNotice && !t(v.to)) e.to = dateMsg;
  else if (!v.untilNotice && t(v.from) && v.to < v.from) e.to = 'The end date must be after the start date.';
  if (v.activation === 'future' && !t(v.futureDate)) e.future = dateMsg;
  return e;
}

export function Signatures() {
  const toast = useToast();
  const [sigs, setSigs] = useState<Signature[]>(SEED_SIGNATURES);
  const [period, setPeriod] = useState<SigPeriod>('current');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | SigStatus>('all');
  const [filterOpen, setFilterOpen] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [notesOpen, setNotesOpen] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<Form | null>(null);
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const filterRef = useRef<HTMLDivElement>(null);
  const filterBtn = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  useDismiss(filterOpen, filterRef, () => setFilterOpen(false), filterBtn);
  useDismiss(menuId !== null, menuRef, () => setMenuId(null));

  const orgs: PickOrg[] = [];
  sigs.forEach((s) => { if (!orgs.some((o) => o.num === s.orgNum)) orgs.push({ num: s.orgNum, name: s.org }); });
  const orgName = (num: string) => orgs.find((o) => o.num === num)?.name ?? '';

  const statuses = Array.from(new Set(sigs.map((s) => s.status)));
  const qn = q.trim().toLowerCase();
  const rows = sigs.filter((s) => s.period === period && (status === 'all' || s.status === status) &&
    (!qn || [s.name, s.org, s.title, s.school].some((x) => x.toLowerCase().includes(qn)) || s.orgNum.includes(qn)));

  const toggleNotes = (id: string) => { setMenuId(null); setNotesOpen((o) => ({ ...o, [id]: !o[id] })); };

  /* ----- form ----- */
  const openForm = (mode: Mode, s?: Signature) => {
    let v: Vals = { org: orgs[0]?.num ?? '', prefix: '', first: '', middle: '', last: '', suffix: '', title: '', school: '', prevSchool: '', newSchool: '', from: '', to: '', untilNotice: true, activation: 'immediate', futureDate: '', notes: '' };
    if (mode === 'edit' && s) {
      const parts = s.name.split(/\s+/).filter(Boolean);
      const prefix = parts.length > 2 && /\.$/.test(parts[0]) ? parts.shift()! : '';
      const first = parts.shift() || ''; const last = parts.pop() || '';
      const until = !s.endDate || /notice/i.test(s.endDate);
      v = { ...v, org: s.orgNum, prefix, first, middle: parts.join(' '), last, title: s.title, school: s.school, from: iso(s.effective), to: until ? '' : iso(s.endDate), untilNotice: until, notes: s.note ?? '' };
    }
    setMenuId(null); setDlg(null);
    setForm({ mode, editId: s?.id ?? null, sigName: s ? s.sigName : '', v, files: [], tried: false });
    window.scrollTo?.(0, 0);
  };
  const err = form?.tried ? validate(form.v, form.mode, form.files) : {};
  const set = <K extends keyof Vals>(k: K, val: Vals[K]) => setForm((f) => (f ? { ...f, v: { ...f.v, [k]: val } } : f));
  const addFiles = (list: FileList | null | undefined) => {
    const ok = /\.(svg|png|jpe?g|pdf|tiff?|bmp|eps)$/i;
    const add = Array.from(list ?? []).filter((f) => ok.test(f.name)).map((f, i) => ({
      id: 'f' + Date.now() + i, name: f.name, size: f.size, isImg: /^image\/(png|jpe?g|svg\+xml|bmp)$/.test(f.type), url: URL.createObjectURL(f),
    }));
    setForm((f) => (f ? { ...f, files: f.files.concat(add) } : f));
  };
  const primary = () => {
    if (!form) return;
    const e = validate(form.v, form.mode, form.files);
    setForm({ ...form, tried: true });
    if (Object.keys(e).length) {
      setTimeout(() => (document.querySelector('#sig-form [aria-invalid="true"]') as HTMLElement | null)?.focus(), 30);
      return;
    }
    setDlg({ kind: 'confirm', warn: true, error: false, failed: false });
  };
  const confirm = () => {
    if (!form || !dlg || dlg.kind !== 'confirm') return;
    const v = form.v;
    if (/error/i.test(v.notes) && !dlg.failed) { setDlg({ ...dlg, error: true, failed: true }); return; }
    const org = orgName(v.org);
    const effective = mdy(v.from); const endDate = v.untilNotice ? 'Until further notice' : mdy(v.to);
    if (form.mode === 'submit') {
      const name = fullName(v);
      setSigs((l) => [{ id: 'sig-new-' + Date.now(), org, orgNum: v.org, name, title: v.title.trim(), school: v.school.trim(), effective, endDate, status: 'pending', period: 'current', signed: false, sigName: name, note: v.notes.trim() }, ...l]);
      toast('Successfully submitted signature', 'Your signature has been submitted and you will see it here shortly. An email will be sent when it is ready for use.');
    } else if (form.mode === 'edit') {
      setSigs((l) => l.map((x) => (x.id === form.editId ? { ...x, org, orgNum: v.org, name: fullName(v), title: v.title.trim(), school: v.school.trim(), effective, endDate, note: v.notes.trim() } : x)));
      toast('Signature details updated', `Your changes to ${fullName(v)} have been saved.`);
    } else {
      const prev = v.prevSchool.trim().toLowerCase();
      setSigs((l) => l.map((x) => (x.orgNum === v.org && x.school.trim().toLowerCase() === prev ? { ...x, school: v.newSchool.trim() } : x)));
      toast('School name update submitted', `${v.prevSchool.trim()} will show as ${v.newSchool.trim()} on current signatures.`);
    }
    setForm(null); setDlg(null); setPeriod('current');
  };

  const previewSig = (s: Signature) => {
    setMenuId(null);
    if (!s.signed) { toast('Preview signature', `${s.name} has not submitted a signature yet.`); return; }
    setDlg({ kind: 'preview', items: [{ label: s.sigName, isImg: false, url: '', sig: s.sigName }], idx: 0 });
  };

  return (
    <>
      {!form && (
        <>
          <PageHeader
            title="Signatures"
            subtitle="Submit new signatures and update school names. Select a row to view its notes, or use the actions menu to edit details or preview a signature."
            actions={
              <>
                <button type="button" className="cc-btn cc-btn--secondary" onClick={() => openForm('school')}>Update school name</button>
                <button type="button" className="cc-btn cc-btn--primary" onClick={() => openForm('submit')}><Plus size={18} aria-hidden="true" />Submit signature</button>
              </>
            }
          />
          <div className={`cc-scr ${styles.wrap}`}>
            <div className={styles.card}>
              <div className={styles.toolbar}>
                <div className={styles.toolbarGroup}>
                  <SegTabs
                    inset label="Signature period" value={period}
                    onChange={(k) => { setPeriod(k); setMenuId(null); }}
                    tabs={([['current', 'Current'], ['past', 'Past'], ['inactive', 'Inactive']] as [SigPeriod, string][]).map(([key, label]) => {
                      const n = sigs.filter((s) => s.period === key && s.status === 'pending').length;
                      return { key, label, count: n > 0 ? `${n} pending` : undefined };
                    })}
                  />
                  <span className={styles.found} role="status" aria-live="polite">{rows.length} {rows.length === 1 ? 'result' : 'results'}</span>
                </div>
                <div className={styles.tools}>
                  <SearchField value={q} onChange={setQ} width={300} placeholder="Search" aria-label="Search signatures" clearable />
                  <div ref={filterRef} className="cc-dropdown">
                    <button ref={filterBtn} type="button" className="cc-btn cc-btn--secondary" aria-haspopup="listbox" aria-expanded={filterOpen} onClick={() => setFilterOpen((o) => !o)}>
                      <Filter size={16} aria-hidden="true" />Filter
                      {status !== 'all' && <span className={styles.filterCount}>1<span className="sr-only"> filter applied</span></span>}
                    </button>
                    {filterOpen && (
                      <div className="cc-dropdown__menu cc-dropdown__menu--end" style={{ width: 232 }}>
                        <div className={styles.menuLabel} id="sg-filter-label">Filter by status</div>
                        <div role="listbox" aria-labelledby="sg-filter-label">
                          {([['all', 'All statuses']] as [string, string][]).concat(statuses.map((s) => [s, SIG_STATUS[s].label])).map(([key, label]) => (
                            <button key={key} type="button" role="option" aria-selected={status === key} className="cc-dropdown__option"
                              onClick={() => { setStatus(key as 'all' | SigStatus); setFilterOpen(false); filterBtn.current?.focus(); }}>
                              <span className="cc-dropdown__label">{label}</span>
                              {status === key && <Check className="cc-dropdown__check" aria-hidden="true" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <CCTable label="Signatures" minWidth="1240px" empty={rows.length === 0} emptyIcon={Feather} emptyTitle="No signatures match this search">
                <thead>
                  <tr>
                    <th style={{ width: 210, paddingLeft: 'var(--space-5)' }}>Organization</th>
                    <th style={{ width: 150 }}>Name</th>
                    <th style={{ width: 150 }}>Title</th>
                    <th style={{ width: 160 }}>Signature</th>
                    <th style={{ width: 170 }}>School</th>
                    <th style={{ width: 120 }}>Effective Date</th>
                    <th style={{ width: 120 }}>End Date</th>
                    <th style={{ width: 110 }}>Status</th>
                    <th style={{ width: 52 }}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => {
                    const m = SIG_STATUS[s.status];
                    const open = !!notesOpen[s.id];
                    return (
                      <Fragment key={s.id}>
                        <tr
                          className={styles.row} tabIndex={0} aria-expanded={open} data-pend={s.status === 'pending'}
                          aria-label={`${s.name}, ${s.org}, ${m.label}. ${open ? 'Hide notes' : 'Show notes'}`}
                          onClick={(e: MouseEvent) => { if ((e.target as HTMLElement).closest('button, a, input')) return; if (String(window.getSelection?.() ?? '').length) return; toggleNotes(s.id); }}
                          onKeyDown={(e: KeyboardEvent) => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggleNotes(s.id); } }}
                        >
                          <td style={{ paddingLeft: 'var(--space-5)', maxWidth: 210 }}>
                            <span className={`${styles.trunc} ${styles.strong}`} title={s.org}>{s.org}</span>
                            <span className={`${styles.trunc} ${styles.muted}`}>{s.orgNum}</span>
                          </td>
                          <td style={{ maxWidth: 150 }}><span className={styles.trunc} title={s.name}>{s.name}</span></td>
                          <td style={{ maxWidth: 150 }}><span className={`${styles.trunc} ${styles.secondary}`} title={s.title}>{s.title}</span></td>
                          <td style={{ maxWidth: 160 }}>
                            {s.signed
                              ? <span className={styles.sigText} style={{ fontFamily: sigFontFor(s.name), fontSize: sigSizeFor(s.sigName) }}>{s.sigName}</span>
                              : <span className={styles.inProgress}>In progress...</span>}
                          </td>
                          <td style={{ maxWidth: 170 }}><span className={`${styles.trunc} ${styles.secondary}`} title={s.school}>{s.school}</span></td>
                          <td className={styles.date}>{s.effective}</td>
                          <td className={styles.date}>{s.endDate}</td>
                          <td><span className={`cc-badge ${m.badge}`}>{m.label}</span></td>
                          <td style={{ textAlign: 'right' }}>
                            <div className="cc-dropdown" ref={menuId === s.id ? menuRef : undefined} style={{ display: 'inline-block' }}>
                              <button type="button" className="cc-icon-btn cc-icon-btn--xs" aria-label={`Row actions for ${s.name}`} aria-haspopup="menu" aria-expanded={menuId === s.id}
                                onClick={() => setMenuId((id) => (id === s.id ? null : s.id))}>
                                <MoreVertical size={18} aria-hidden="true" />
                              </button>
                              {menuId === s.id && (
                                <div className="cc-dropdown__menu cc-dropdown__menu--end" role="menu" style={{ width: 208 }}>
                                  <button type="button" role="menuitem" className="cc-dropdown__option" onClick={() => toggleNotes(s.id)}><Paperclip size={16} aria-hidden="true" className={styles.menuIcon} />{open ? 'Hide notes' : 'View notes'}</button>
                                  <button type="button" role="menuitem" className="cc-dropdown__option" onClick={() => openForm('edit', s)}><Pencil size={16} aria-hidden="true" className={styles.menuIcon} />Edit details</button>
                                  <button type="button" role="menuitem" className="cc-dropdown__option" onClick={() => previewSig(s)}><Eye size={16} aria-hidden="true" className={styles.menuIcon} />Preview signature</button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        {open && (
                          <tr className={styles.notesRow}>
                            <td colSpan={9} style={{ paddingLeft: 'var(--space-5)' }}>
                              <p><span className={styles.noteLabel}>Client notes:</span> {s.note || 'No client notes recorded.'}</p>
                              <p style={{ marginTop: 'var(--space-1)' }}><span className={styles.noteLabel}>Internal notes:</span> {s.internalNote || 'No internal notes recorded.'}</p>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </CCTable>
            </div>
          </div>
        </>
      )}

      {form && (() => {
        const { mode, v } = form;
        const errN = Object.keys(err).length;
        const field = (key: keyof Vals, label: string, req = false) => (
          <div className={styles.formRow} key={key}>
            <label htmlFor={`sig-in-${key}`} className={styles.formLabel}>{label}{req && <span aria-hidden="true" className={styles.req}> *</span>}</label>
            <div>
              <input id={`sig-in-${key}`} type="text" className="cc-input" value={v[key] as string} onChange={(e) => set(key, e.target.value)}
                aria-required={req} aria-invalid={!!err[key]} aria-describedby={err[key] ? `sig-err-${key}` : undefined} />
              {err[key] && <p id={`sig-err-${key}`} className={styles.err}>{err[key]}</p>}
            </div>
          </div>
        );
        const previewItems = form.files.map((x) => ({ label: x.name, isImg: x.isImg, url: x.url, sig: fullName(v) || x.name.replace(/\.[^.]+$/, '') }));
        return (
          <div id="sig-form" className={`cc-scr ${styles.form}`}>
            <nav aria-label="Breadcrumb" className={styles.crumbs}>
              <button type="button" className="cc-icon-btn cc-icon-btn--xs" aria-label="Back to Signatures" onClick={() => setForm(null)}><Feather size={18} aria-hidden="true" /></button>
              <ChevronRight size={16} aria-hidden="true" style={{ color: 'var(--gray-400)' }} />
              <span aria-current="page" className={styles.crumbCur}>{mode === 'submit' ? 'Submit signature' : mode === 'edit' ? 'Edit details' : 'Update school name'}</span>
            </nav>
            <div className={styles.formHead}>
              <div style={{ minWidth: 0, flex: '1 1 360px' }}>
                <h1 className={styles.formTitle}>{mode === 'submit' ? 'Submit new signature' : mode === 'edit' ? 'Edit signature details' : 'Submit school name update'}</h1>
                <p className={styles.formSub}>{mode === 'submit' ? 'Please enter details exactly as they are to appear on documents.' : mode === 'edit' ? 'Edit details for an existing signature.' : 'Update the school name for all of the current signature details to reflect the new name.'}</p>
                {mode === 'submit' && (
                  <p className={styles.banner}><Clock size={14} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} />Please submit your signature request 2 business days before placing an order. An email will be sent when this signature is activated.</p>
                )}
              </div>
              <div className={styles.actions}>
                <button type="button" className="cc-btn cc-btn--secondary" onClick={() => setForm(null)}>Cancel</button>
                <button type="button" className="cc-btn cc-btn--primary" onClick={primary}>
                  {mode !== 'edit' && <Plus size={18} aria-hidden="true" />}
                  {mode === 'submit' ? 'Submit signature' : mode === 'edit' ? 'Save changes' : 'Submit update'}
                </button>
              </div>
            </div>

            <div role="status" aria-live="polite" style={{ marginTop: 'var(--space-4)' }}>
              {errN > 0 && <div className={styles.summary}><AlertCircle size={16} aria-hidden="true" />{errN === 1 ? 'Fix 1 field to continue.' : `Fix ${errN} fields to continue.`}</div>}
            </div>

            <div className={styles.fields}>
              {mode === 'submit' && (
                <div className={styles.formRow}>
                  <div id="sig-upload-label" className={styles.formLabel}>Upload signature <span aria-hidden="true" className={styles.req}>*</span></div>
                  <div>
                    <div className={styles.drop} data-err={!!err.file} onDragOver={(e: DragEvent) => e.preventDefault()} onDrop={(e: DragEvent) => { e.preventDefault(); addFiles(e.dataTransfer?.files); }}>
                      <button id="sig-upload-btn" type="button" className={styles.dropBtn} onClick={() => fileInput.current?.click()}
                        aria-labelledby="sig-upload-label sig-upload-cta" aria-describedby={err.file ? 'sig-err-file sig-upload-hint' : 'sig-upload-hint'} aria-invalid={!!err.file}>
                        <span aria-hidden="true" className={styles.dropIcon}><UploadCloud size={20} /></span>
                        <span id="sig-upload-cta" className={styles.dropCta}><b>Click to upload</b> or drag and drop</span>
                      </button>
                      <div id="sig-upload-hint" className={styles.hint}>SVG, PNG, JPG, PDF, TIFF, BMP or EPS</div>
                      <input ref={fileInput} type="file" multiple accept=".svg,.png,.jpg,.jpeg,.pdf,.tif,.tiff,.bmp,.eps" tabIndex={-1} aria-hidden="true" className="sr-only"
                        onChange={(e) => { addFiles(e.target.files); e.target.value = ''; }} />
                    </div>
                    {err.file && <p id="sig-err-file" className={styles.err}>{err.file}</p>}
                    {form.files.map((x, i) => (
                      <div key={x.id} className={styles.fileCard}>
                        <div className={styles.fileTop}>
                          <div style={{ minWidth: 0 }}>
                            <div className={`${styles.trunc} ${styles.fileName}`}>{x.name}</div>
                            <div className={styles.fileMeta}>{kb(x.size)} of {kb(x.size)} <span aria-hidden="true" style={{ color: 'var(--gray-300)' }}>|</span> <span className={styles.complete}><CheckCircle2 size={14} aria-hidden="true" />Complete</span></div>
                          </div>
                          <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                            <button type="button" className="cc-icon-btn cc-icon-btn--xs" aria-label={`Remove ${x.name}`} onClick={() => { setForm((f) => (f ? { ...f, files: f.files.filter((z) => z.id !== x.id) } : f)); document.getElementById('sig-upload-btn')?.focus(); }}><Trash2 size={16} aria-hidden="true" /></button>
                            <button type="button" className="cc-icon-btn cc-icon-btn--xs" aria-label={`Preview ${x.name}`} onClick={() => setDlg({ kind: 'preview', items: previewItems, idx: i })}><Eye size={16} aria-hidden="true" /></button>
                          </div>
                        </div>
                        <div className={styles.progressRow}>
                          <div role="progressbar" aria-valuenow={100} aria-valuemin={0} aria-valuemax={100} aria-label={`${x.name} upload progress`} className={styles.progress} />
                          <span className={styles.fileName}>100%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {mode === 'edit' && (
                <div className={styles.formRow}>
                  <div>
                    <div className={styles.formLabel}>View signature</div>
                    <div className={styles.formHint}>Please submit a signature request to upload a new signature.</div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <span style={{ fontFamily: sigFontFor(form.sigName), fontSize: 'var(--text-display-sm-size)', lineHeight: '40px', color: 'var(--gray-900)' }}>{form.sigName}</span>
                    <button type="button" className="cc-btn cc-btn--secondary cc-btn--sm" aria-label="Preview signature" onClick={() => setDlg({ kind: 'preview', items: [{ label: form.sigName, isImg: false, url: '', sig: form.sigName }], idx: 0 })}><Eye size={18} aria-hidden="true" /></button>
                  </div>
                </div>
              )}

              <div className={styles.formRow}>
                <label htmlFor="sig-org" className={styles.formLabel}>Organization <span aria-hidden="true" className={styles.req}>*</span></label>
                <div>
                  <DocsSigOrgPicker id="sig-org" orgs={orgs} value={v.org} onChange={(n) => set('org', n)} invalid={!!err.org} describedBy={err.org ? 'sig-err-org' : undefined} />
                  {err.org && <p id="sig-err-org" className={styles.err}>{err.org}</p>}
                </div>
              </div>

              {mode === 'school'
                ? [field('prevSchool', 'Previous School/College', true), field('newSchool', 'New School/College', true)]
                : [field('prefix', 'Prefix'), field('first', 'First Name', true), field('middle', 'Middle Name'), field('last', 'Last Name', true), field('suffix', 'Suffix'), field('title', 'Title', true), field('school', 'School/College')]}

              <div className={styles.formRow}>
                <div>
                  <div id="sig-eff-label" className={styles.formLabel}>Effective Date <span aria-hidden="true" className={styles.req}>*</span></div>
                  <div id="sig-eff-hint" className={styles.formHint}>{mode === 'school' ? 'When did the school name officially change?' : 'When did the signatory officially begin their role?'}</div>
                </div>
                <div role="group" aria-labelledby="sig-eff-label" aria-describedby="sig-eff-hint" className={styles.dates}>
                  <div>
                    <label htmlFor="sig-in-from" className={styles.subLabel}>From</label>
                    <input id="sig-in-from" type="date" className="cc-input" value={v.from} onChange={(e) => set('from', e.target.value)} aria-required="true" aria-invalid={!!err.from} aria-describedby={err.from ? 'sig-err-from' : undefined} />
                    {err.from && <p id="sig-err-from" className={styles.err}>{err.from}</p>}
                  </div>
                  <div>
                    <label htmlFor="sig-in-to" className={styles.subLabel}>To</label>
                    <input id="sig-in-to" type="date" className="cc-input" value={v.untilNotice ? '' : v.to} disabled={v.untilNotice} onChange={(e) => set('to', e.target.value)} aria-invalid={!!err.to} aria-describedby={err.to ? 'sig-err-to' : undefined} />
                    {err.to && <p id="sig-err-to" className={styles.err}>{err.to}</p>}
                    <label className="cc-checkbox" style={{ marginTop: 'var(--space-2_5)' }}>
                      <input type="checkbox" className="cc-checkbox__input" checked={v.untilNotice} onChange={(e) => set('untilNotice', e.target.checked)} />Until further notice
                    </label>
                  </div>
                </div>
              </div>

              <div className={styles.formRow}>
                <div>
                  <div id="sig-act-label" className={styles.formLabel}>Activation Date <span aria-hidden="true" className={styles.req}>*</span></div>
                  <div id="sig-act-hint" className={styles.formHint}>{mode === 'school' ? 'When should we begin using this school name update?' : 'When should we begin using this signature?'}</div>
                </div>
                <div role="radiogroup" aria-labelledby="sig-act-label" aria-describedby="sig-act-hint" aria-required="true">
                  <label className="cc-radio" style={{ alignItems: 'flex-start' }}>
                    <input type="radio" className="cc-radio__input" name="sig-activation" checked={v.activation === 'immediate'} onChange={() => set('activation', 'immediate')} />
                    <span><span style={{ display: 'block' }}>Immediately</span>{mode !== 'school' && <span className={styles.formHint}>Signature will be used after 2 business days.</span>}</span>
                  </label>
                  <label className="cc-radio" style={{ marginTop: 'var(--space-2_5)' }}>
                    <input type="radio" className="cc-radio__input" name="sig-activation" checked={v.activation === 'future'} onChange={() => set('activation', 'future')} />Future Date
                  </label>
                  {v.activation === 'future' && (
                    <div style={{ margin: 'var(--space-2_5) 0 0 var(--space-6)', maxWidth: 200 }}>
                      <label htmlFor="sig-in-future" className={styles.subLabel}>Activation date</label>
                      <input id="sig-in-future" type="date" className="cc-input" value={v.futureDate} onChange={(e) => set('futureDate', e.target.value)} aria-required="true" aria-invalid={!!err.future} aria-describedby={err.future ? 'sig-err-future' : undefined} />
                      {err.future && <p id="sig-err-future" className={styles.err}>{err.future}</p>}
                    </div>
                  )}
                </div>
              </div>

              <div className={styles.formRow}>
                <label htmlFor="sig-in-notes" className={styles.formLabel}>Notes</label>
                <textarea id="sig-in-notes" rows={4} className="cc-input" style={{ height: 'auto', padding: 'var(--space-2_5) var(--space-3)', resize: 'vertical' }}
                  value={v.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Are there any important notes you would like to share with us?" />
              </div>
            </div>
          </div>
        );
      })()}

      {dlg?.kind === 'preview' && (() => {
        const items = dlg.items; const i = Math.min(dlg.idx, items.length - 1); const it = items[i];
        const close = () => setDlg(null);
        return (
          <SigModal titleId="sig-dlg-title" onClose={close} width={720}>
            <div className={styles.dlgHead}>
              <span aria-hidden="true" className={styles.dlgIcon}><Eye size={20} /></span>
              <div style={{ minWidth: 0 }}>
                <h2 id="sig-dlg-title" tabIndex={-1} className={styles.dlgTitle}>Preview</h2>
                <p className={`${styles.trunc} ${styles.formSub}`} style={{ marginTop: 0 }}>{it.label}</p>
              </div>
            </div>
            <button type="button" className={`cc-icon-btn ${styles.dlgClose}`} aria-label="Close preview" onClick={close}><X size={20} aria-hidden="true" /></button>
            <div className={styles.stage}>
              {it.isImg && it.url
                ? <img src={it.url} alt={it.label} style={{ maxWidth: '100%', maxHeight: 220, objectFit: 'contain' }} />
                : <span role="img" aria-label={`Signature: ${it.sig}`} style={{ fontFamily: sigFontFor(it.sig), fontSize: 'var(--text-display-xl-size)', lineHeight: 1.2, color: 'var(--gray-900)', textAlign: 'center' }}>{it.sig}</span>}
              {items.length > 1 && (
                <>
                  <button type="button" className={styles.navBtn} style={{ left: 12, opacity: i <= 0 ? 0.4 : 1 }} aria-label="Previous file" aria-disabled={i <= 0} onClick={() => i > 0 && setDlg({ ...dlg, idx: i - 1 })}><ChevronLeft size={20} aria-hidden="true" /></button>
                  <button type="button" className={styles.navBtn} style={{ right: 12, opacity: i >= items.length - 1 ? 0.4 : 1 }} aria-label="Next file" aria-disabled={i >= items.length - 1} onClick={() => i < items.length - 1 && setDlg({ ...dlg, idx: i + 1 })}><ChevronRight size={20} aria-hidden="true" /></button>
                </>
              )}
            </div>
            <div role="status" aria-live="polite" className="sr-only">{items.length > 1 ? `Showing ${i + 1} of ${items.length}: ${it.label}` : ''}</div>
            <div className={styles.dlgFoot}>
              {items.length > 1 && <span aria-hidden="true" className={styles.formSub} style={{ marginTop: 0 }}>{i + 1} of {items.length}</span>}
              <button type="button" className="cc-btn cc-btn--secondary" onClick={close}>Close preview</button>
            </div>
          </SigModal>
        );
      })()}

      {dlg?.kind === 'confirm' && form && (() => {
        const { v, mode } = form;
        const orgText = `(${v.org}) ${orgName(v.org)}`;
        const dates = `${mdy(v.from) || '—'} – ${v.untilNotice ? 'Until further notice' : mdy(v.to)}`;
        const act = v.activation === 'future' ? mdy(v.futureDate) : 'Immediately';
        const rowsD = mode === 'school'
          ? [['Organization', orgText], ['Previous School/College', v.prevSchool.trim()], ['New School/College', v.newSchool.trim()], ['Effective & End Date', dates], ['Activation Date', act]]
          : [['Name', fullName(v)], ['Title', v.title.trim()], ['Effective & End Date', dates], ['Activation Date', act], ['Organization', orgText], ['School', v.school.trim() || '—']];
        const close = () => setDlg(null);
        return (
          <SigModal titleId="sig-dlg-title" describedBy="sig-dlg-sub" onClose={close} width={560} flush>
            <div className={styles.confirmHead}>
              <span aria-hidden="true" className={styles.dlgIconLg}><Feather size={22} /></span>
              <div>
                <h2 id="sig-dlg-title" tabIndex={-1} className={styles.dlgTitleLg}>{mode === 'submit' ? 'Submit signature' : mode === 'edit' ? 'Save signature details' : 'Submit school name update'}</h2>
                <p id="sig-dlg-sub" className={styles.formSub} style={{ marginTop: 0 }}>{mode === 'edit' ? 'Confirm your changes before saving.' : mode === 'submit' ? 'Confirm your signature details before submission.' : 'Confirm the school name update before submission.'}</p>
              </div>
            </div>
            <button type="button" className={`cc-icon-btn ${styles.dlgClose}`} aria-label="Close" onClick={close}><X size={20} aria-hidden="true" /></button>
            <div style={{ padding: 'var(--space-5) var(--space-6) 0' }}>
              {dlg.error && (
                <div role="alert" className={styles.dlgError}>
                  <AlertCircle size={20} aria-hidden="true" style={{ flexShrink: 0 }} />
                  <div><div className={styles.strongErr}>{mode === 'school' ? 'Problem submitting update' : mode === 'edit' ? 'Problem saving changes' : 'Problem submitting signature'}</div><div>We are having trouble submitting your request. Please try again.</div></div>
                </div>
              )}
              <h3 className={styles.detailsTitle}>{mode === 'school' ? 'School name update' : 'Signature details'}</h3>
              <dl className={styles.dl}>
                {rowsD.map(([l, val]) => <div key={l} style={{ minWidth: 0 }}><dt>{l}</dt><dd>{val}</dd></div>)}
                {v.notes.trim() && <div style={{ gridColumn: '1 / -1' }}><dt>Notes</dt><dd>{v.notes.trim()}</dd></div>}
              </dl>
              {dlg.warn && mode !== 'edit' && (
                <div className={styles.warn}>
                  <AlertCircle size={20} aria-hidden="true" style={{ flexShrink: 0, color: 'var(--warning-700)' }} />
                  <div><div className={styles.strong}>{mode === 'school' ? 'School name update' : 'Signature Request'}</div><div style={{ color: 'var(--gray-700)' }}>Please submit your request 2 business days before placing an order. An email will be sent when it is activated.</div></div>
                  <button type="button" className="cc-icon-btn cc-icon-btn--xs" style={{ position: 'absolute', top: 8, right: 8 }} aria-label="Dismiss message" onClick={() => setDlg({ ...dlg, warn: false })}><X size={16} aria-hidden="true" /></button>
                </div>
              )}
            </div>
            <div className={styles.confirmFoot}>
              <button type="button" className="cc-btn cc-btn--secondary" onClick={close}>Close</button>
              <button type="button" className="cc-btn cc-btn--primary" onClick={confirm}>Confirm details</button>
            </div>
          </SigModal>
        );
      })()}
    </>
  );
}

/* Modal shell for the signature dialogs: overlay click and Esc close it; focus goes to the title on open and back on close. */
function SigModal({ titleId, describedBy, onClose, width, flush, children }: { titleId: string; describedBy?: string; onClose: () => void; width: number; flush?: boolean; children: ReactNode }) {
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    setTimeout(() => document.getElementById(titleId)?.focus(), 0);
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') { e.stopPropagation(); closeRef.current(); } };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); setTimeout(() => { if (opener && document.body.contains(opener)) opener.focus(); }, 0); };
  }, [titleId]);
  return (
    <div className="cc-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={describedBy}>
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0 }} onClick={onClose} />
      <div className={flush ? styles.modalFlush : styles.modal} style={{ width }}>{children}</div>
    </div>
  );
}
