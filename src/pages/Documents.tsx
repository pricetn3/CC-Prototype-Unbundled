/* Documents: client documents per organization (Active / Deleted, with edit history) and helpful documents
   shared with every organization. Add, edit, delete and preview work in memory; uploads keep only the file's
   name and size. "View FAQ's" shows the Support FAQ in place. */

import { useCallback, useEffect, useRef, useState, type DragEvent, type MouseEvent } from 'react';
import {
  CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Download, Eye, Feather, FilePlus, History, Info,
  Package, Pencil, Plus, Search, Trash2, UploadCloud, ZoomIn, ZoomOut,
} from 'lucide-react';
import { Dialog } from '../components/Dialog';
import { PageHeader } from '../components/PageHeader';
import { SegTabs } from '../components/SegTabs';
import { useToast } from '../components/Toast';
import { DocsSigOrgPicker } from '../components/DocsSigOrgPicker';
import { CURRENT_USER } from '../data/store';
import {
  DOC_ORGS, DOC_SECTIONS, DOC_TYPES, SEED_CLIENT_DOCS, SEED_HELPFUL_DOCS,
  type ClientDoc, type DocLine, type HelpfulDoc,
} from '../data/documents';
import { SupportFaq } from './Support';
import styles from './Documents.module.css';

type Kind = 'client' | 'helpful';
interface UpFile { name: string; size: number; ext: string; url: string }
interface Form {
  kind: Kind; mode: 'add' | 'edit'; id: string | null; tried: boolean; fileErr: string; drag: boolean; pct: number;
  org: string; type: string; desc: string; section: string; name: string; file: UpFile | null;
}

const fmtSize = (b: number) => (b >= 1048576 ? (b / 1048576).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');
const extMeta = (ext: string) => {
  const e = ext.toLowerCase();
  return { label: e === 'jpeg' ? 'JPG' : e.toUpperCase(), bg: e === 'xlsx' ? 'var(--success-600)' : e === 'pdf' ? 'var(--error-600)' : 'var(--blue-600)' };
};
const now = () => new Date().toLocaleString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric', hour: 'numeric', minute: '2-digit' }) + ' EST';
const orgName = (num: string) => DOC_ORGS.find((o) => o.num === num)?.name ?? '';
const valid = (f: Form) => {
  const fileOk = !!f.file && f.pct >= 100;
  return f.kind === 'client' ? !!f.org && !!f.type && fileOk : !!f.section && !!f.name.trim() && fileOk;
};

function FileIcon({ ext, small }: { ext: string; small?: boolean }) {
  const m = extMeta(ext);
  return (
    <span aria-hidden="true" className={small ? styles.fileIconSm : styles.fileIcon}>
      <svg width={small ? 24 : 32} height={small ? 30 : 40} viewBox="0 0 32 40" fill="none">
        <path d="M4 .75h16.5L31.25 11.5V36A3.25 3.25 0 0 1 28 39.25H4A3.25 3.25 0 0 1 .75 36V4A3.25 3.25 0 0 1 4 .75Z" stroke="var(--gray-300)" fill="var(--bg-primary)" strokeWidth="1.5" />
        {!small && <path d="M20.5 .75V8a3.5 3.5 0 0 0 3.5 3.5h7.25" stroke="var(--gray-300)" strokeWidth="1.5" />}
      </svg>
      <span className={styles.extTag} style={{ background: m.bg }}>{m.label}</span>
    </span>
  );
}

export function Documents() {
  const toast = useToast();
  const [view, setView] = useState<'docs' | 'faq'>('docs');
  const [tab, setTab] = useState<Kind>('client');
  const [client, setClient] = useState<ClientDoc[]>(SEED_CLIENT_DOCS);
  const [helpful, setHelpful] = useState<HelpfulDoc[]>(SEED_HELPFUL_DOCS);
  const [org, setOrg] = useState('');
  const [sub, setSub] = useState<'active' | 'deleted'>('active');
  const [hist, setHist] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<Form | null>(null);
  const [del, setDel] = useState<{ kind: Kind; id: string } | null>(null);
  const [prev, setPrev] = useState<{ kind: Kind; id: string; page: number; zoom: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearInterval(timer.current), []);
  // Stable close handlers: Dialog re-runs its focus effect when onClose changes.
  const closeForm = useCallback(() => { window.clearInterval(timer.current); setForm(null); }, []);
  const closeDel = useCallback(() => setDel(null), []);
  const closePrev = useCallback(() => setPrev(null), []);

  if (view === 'faq') return <SupportFaq onBack={() => setView('docs')} />;

  const me = CURRENT_USER.name;
  const inOrg = client.filter((d) => d.org === org);
  const activeN = inOrg.filter((d) => d.status === 'active').length;
  const shown = inOrg.filter((d) => d.status === sub);

  const download = (d: { fileName: string; blobUrl?: string }) => {
    if (d.blobUrl) { const a = document.createElement('a'); a.href = d.blobUrl; a.download = d.fileName; document.body.appendChild(a); a.click(); a.remove(); }
    toast('Download started', `${d.fileName} is downloading.`);
  };

  /* ----- form ----- */
  const openForm = (kind: Kind, mode: 'add' | 'edit', d?: ClientDoc | HelpfulDoc) => {
    const c = d as ClientDoc | undefined; const h = d as HelpfulDoc | undefined;
    setForm({
      kind, mode, id: d?.id ?? null, tried: false, fileErr: '', drag: false, pct: d ? 100 : 0,
      org: kind === 'client' ? (c?.org ?? org) : '', type: c?.type ?? '', desc: c?.desc ?? '',
      section: kind === 'helpful' ? (h?.section ?? '') : '', name: kind === 'helpful' ? (h?.name ?? '') : '',
      file: d ? { name: d.fileName, size: d.size, ext: d.ext, url: d.blobUrl ?? '' } : null,
    });
  };
  const patch = (p: Partial<Form>) => setForm((f) => (f ? { ...f, ...p } : f));
  const setFile = (file: File) => {
    const ext = (file.name.split('.').pop() || '').toLowerCase();
    if (!['xlsx', 'pdf', 'svg', 'png', 'jpg', 'jpeg'].includes(ext)) { patch({ fileErr: 'This file type isn’t supported. Upload an XLSX, PDF, SVG, PNG or JPG file.', drag: false }); return; }
    if (file.size > 50 * 1048576) { patch({ fileErr: 'This file is larger than 50 MB. Upload a smaller file.', drag: false }); return; }
    patch({ file: { name: file.name, size: file.size, ext, url: URL.createObjectURL(file) }, pct: 0, fileErr: '', drag: false });
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      setForm((f) => {
        if (!f || !f.file) { window.clearInterval(timer.current); return f; }
        const pct = Math.min(100, f.pct + 20);
        if (pct >= 100) window.clearInterval(timer.current);
        return { ...f, pct };
      });
    }, 90);
  };
  const submit = () => {
    if (!form) return;
    const f = form;
    if (!valid(f)) { patch({ tried: true, fileErr: f.file ? f.fileErr : 'Upload a file.' }); return; }
    const t = now(); const file = f.file!;
    if (f.kind === 'client') {
      if (f.mode === 'add') {
        setClient((l) => [{ id: 'cd' + Date.now(), org: f.org, type: f.type, desc: f.desc.trim(), ext: file.ext, fileName: file.name, size: file.size, blobUrl: file.url, status: 'active', who: me, when: t,
          events: [{ kind: 'Uploaded', who: me, when: t, lines: [{ parts: [{ text: 'Initial document was created.' }] }] }] }, ...l]);
        setOrg(f.org); setSub('active');
        toast('Document added', `${f.type} was added for ${orgName(f.org)}.`);
      } else {
        const d = client.find((x) => x.id === f.id); if (!d) return;
        const lines: DocLine[] = [];
        if (file.name !== d.fileName || file.url !== (d.blobUrl ?? '')) lines.push({ parts: [{ text: 'Replaced file ' }, { text: d.fileName, file: true }, { text: ' with ' }, { text: file.name, file: true }] });
        if (f.desc.trim() !== d.desc) lines.push({ parts: [{ text: `Updated description from "${d.desc}" to "${f.desc.trim()}"` }] });
        if (f.type !== d.type) lines.push({ parts: [{ text: `Changed document type from ${d.type} to ${f.type}` }] });
        if (f.org !== d.org) lines.push({ parts: [{ text: `Moved to ${orgName(f.org)}` }] });
        if (!lines.length) { closeForm(); return; }
        setClient((l) => l.map((x) => (x.id !== d.id ? x : { ...x, org: f.org, type: f.type, desc: f.desc.trim(), ext: file.ext, fileName: file.name, size: file.size, blobUrl: file.url || x.blobUrl, who: me, when: t,
          events: [{ kind: 'Edited', who: me, when: t, lines }, ...x.events] })));
        setOrg(f.org);
        toast('Document updated', `Changes to ${f.type} were saved.`);
      }
    } else {
      const rec = { section: f.section as HelpfulDoc['section'], name: f.name.trim(), ext: file.ext, fileName: file.name, size: file.size, blobUrl: file.url, who: me, when: t };
      if (f.mode === 'add') { setHelpful((l) => [...l, { id: 'hd' + Date.now(), ...rec }]); toast('Document added', `${rec.name} is now available to all organizations.`); }
      else { setHelpful((l) => l.map((x) => (x.id === f.id ? { ...x, ...rec } : x))); toast('Document updated', `Changes to ${rec.name} were saved.`); }
    }
    closeForm();
  };

  const confirmDelete = () => {
    if (!del) return;
    if (del.kind === 'client') {
      const t = now(); const d = client.find((z) => z.id === del.id);
      setClient((l) => l.map((x) => (x.id !== del.id ? x : { ...x, status: 'deleted', who: me, when: t, events: [{ kind: 'Deleted', who: me, when: t, lines: [{ parts: [{ text: 'Document was deleted.' }] }] }, ...x.events] })));
      toast('Document deleted', `${d?.type} moved to Deleted.`);
    } else {
      const d = helpful.find((z) => z.id === del.id);
      setHelpful((l) => l.filter((z) => z.id !== del.id));
      toast('Document deleted', `${d?.name || 'The document'} was removed from helpful documents.`);
    }
    setDel(null);
  };

  return (
    <>
      <PageHeader title="Documents" subtitle="Manage and track documents.">
        <div style={{ marginTop: 'var(--space-5)' }}>
          <SegTabs label="Document type" value={tab} onChange={setTab} tabs={[{ key: 'client', label: 'Client' }, { key: 'helpful', label: 'Helpful' }]} />
        </div>
      </PageHeader>

      <div className={`cc-scr ${styles.body}`}>
        {tab === 'client' && (
          <>
            <div className={styles.sectionHead}>
              <div>
                <h2 className={styles.sectionTitle}>Client documents</h2>
                <p className={styles.subtitleSm}>Specific documents for a selected organization.</p>
              </div>
              <div className={styles.headActions}>
                <DocsSigOrgPicker id="ds-org" orgs={DOC_ORGS} value={org} width={320} onChange={(n) => { setOrg(n); setSub('active'); setHist({}); }} />
                <button type="button" className="cc-btn cc-btn--primary" onClick={() => openForm('client', 'add')}><Plus size={18} aria-hidden="true" />Add document</button>
              </div>
            </div>

            {org && (
              <div className="cc-utabs" role="tablist" aria-label="Document status" style={{ marginTop: 'var(--space-4)' }}>
                {(['active', 'deleted'] as const).map((k) => (
                  <button key={k} type="button" role="tab" aria-selected={sub === k} className="cc-utabs__tab" onClick={() => setSub(k)}>
                    {k === 'active' ? 'Active' : 'Deleted'}
                    {k === 'active' && <span className="cc-badge cc-badge--brand">{activeN}</span>}
                  </button>
                ))}
              </div>
            )}

            {!org && <div className={styles.noOrg}>Select an organization to view their client documents.</div>}

            {org && shown.length === 0 && (
              <div className={styles.empty}>
                <span aria-hidden="true" className={styles.emptyIcon}><Search size={24} /></span>
                <div className={styles.emptyTitle}>{sub === 'deleted' ? 'No deleted documents' : 'No documents found!'}</div>
                <div className={styles.subtitleSm}>{sub === 'deleted' ? 'Documents you delete for this organization appear here.' : 'No client documents have been added for this organization.'}</div>
                {sub === 'active' && <button type="button" className="cc-btn cc-btn--primary" style={{ marginTop: 'var(--space-5)' }} onClick={() => openForm('client', 'add')}><Plus size={18} aria-hidden="true" />Add document</button>}
              </div>
            )}

            <div className={styles.cards}>
              {shown.map((d) => {
                const isDel = d.status === 'deleted'; const open = !!hist[d.id]; const n = d.events.length;
                const title = `${d.type} | ${orgName(d.org)}`;
                const toggle = () => setHist((h) => ({ ...h, [d.id]: !open }));
                return (
                  <article key={d.id} aria-label={title} className={styles.docCard} data-del={isDel} data-open={open}
                    onClick={(e: MouseEvent) => { if (n === 0 || (e.target as HTMLElement).closest('button, a, input, ol')) return; toggle(); }}>
                    <div className={styles.docTop}>
                      <FileIcon ext={d.ext} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className={styles.docTitleRow}>
                          <h3 className={styles.docTitle}>{d.type}<span aria-hidden="true" className={styles.sep} />{orgName(d.org)}</h3>
                          {!isDel && <button type="button" className="cc-icon-btn cc-icon-btn--xs" aria-label={`Edit ${title}`} title="Edit" onClick={() => openForm('client', 'edit', d)}><Pencil size={16} aria-hidden="true" /></button>}
                        </div>
                        <p className={styles.subtitleSm}>{d.desc || 'No description.'}</p>
                      </div>
                      {!isDel && (
                        <div className={styles.docActs}>
                          <button type="button" className="cc-icon-btn" aria-label={`Preview ${title}`} title="Preview" onClick={() => setPrev({ kind: 'client', id: d.id, page: 1, zoom: false })}><Eye size={18} aria-hidden="true" /></button>
                          <button type="button" className="cc-icon-btn" aria-label={`Download ${title}`} title="Download" onClick={() => download(d)}><Download size={18} aria-hidden="true" /></button>
                          <button type="button" className="cc-icon-btn" aria-label={`Delete ${title}`} title="Delete" onClick={() => setDel({ kind: 'client', id: d.id })}><Trash2 size={18} aria-hidden="true" /></button>
                        </div>
                      )}
                    </div>
                    <div className={styles.docFoot}>
                      <span>{d.who}{isDel ? ' deleted ' : ' updated '}{d.when}</span>
                      {n > 0 && (
                        <button type="button" className={styles.histBtn} aria-expanded={open} onClick={toggle}>
                          <History size={16} aria-hidden="true" />View history ({n}{n === 1 ? ' event)' : ' events)'}
                          {open ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
                        </button>
                      )}
                    </div>
                    {open && (
                      <ol className={styles.hist}>
                        {d.events.map((ev, i) => (
                          <li key={i}>
                            <span><span className={`cc-badge cc-badge--square ${ev.kind === 'Uploaded' ? 'cc-badge--success' : ev.kind === 'Deleted' ? 'cc-badge--error' : 'cc-badge--brand'}`}>{ev.kind}</span></span>
                            <div>
                              <div className={styles.histWho}>{ev.who}</div>
                              {ev.lines.map((ln, j) => (
                                <div key={j} className={styles.histLine}>{ln.parts.map((p, k) => <span key={k} style={p.file ? { color: 'var(--blue-700)' } : undefined}>{p.text}</span>)}</div>
                              ))}
                            </div>
                            <span className={styles.histWhen}>{ev.when}</span>
                          </li>
                        ))}
                      </ol>
                    )}
                  </article>
                );
              })}
            </div>
          </>
        )}

        {tab === 'helpful' && (
          <>
            <div className={styles.sectionHead}>
              <div>
                <h2 className={styles.sectionTitle}>Helpful documents</h2>
                <p className={styles.subtitleSm}>Documents used as a reference for all organizations.</p>
              </div>
              <div className={styles.headActions}>
                <button type="button" className="cc-btn cc-btn--secondary" onClick={() => setView('faq')}>View FAQ's</button>
                <button type="button" className="cc-btn cc-btn--primary" onClick={() => openForm('helpful', 'add')}><Plus size={18} aria-hidden="true" />Add document</button>
              </div>
            </div>
            {DOC_SECTIONS.map(([key, name]) => {
              const docs = helpful.filter((h) => h.section === key).sort((a, b) => a.name.localeCompare(b.name));
              const Icon = key === 'general' ? Info : key === 'shipping' ? Package : Feather;
              return (
                <section key={key} aria-label={name} className={styles.helpSec}>
                  <h3 className={styles.helpSecTitle}><span aria-hidden="true" className={styles.secIcon}><Icon size={16} /></span>{name}</h3>
                  {docs.length === 0 && <p className={styles.subtitleSm}>No documents in this section yet.</p>}
                  <div className={styles.helpGrid}>
                    {docs.map((h) => (
                      <div key={h.id} className={styles.helpRow}>
                        <FileIcon ext={h.ext} small />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <button type="button" className={styles.helpName} title="Preview" onClick={() => setPrev({ kind: 'helpful', id: h.id, page: 1, zoom: false })}>{h.name}</button>
                          <div className={styles.helpMeta}>{h.who} updated {h.when}</div>
                        </div>
                        <div className={styles.helpActs}>
                          <button type="button" className="cc-icon-btn cc-icon-btn--xs" title="Download" aria-label={`Download ${h.name}`} onClick={() => download(h)}><Download size={16} aria-hidden="true" /></button>
                          <button type="button" className="cc-icon-btn cc-icon-btn--xs" title="Edit" aria-label={`Edit ${h.name}`} onClick={() => openForm('helpful', 'edit', h)}><Pencil size={16} aria-hidden="true" /></button>
                          <button type="button" className="cc-icon-btn cc-icon-btn--xs" title="Delete" aria-label={`Delete ${h.name}`} onClick={() => setDel({ kind: 'helpful', id: h.id })}><Trash2 size={16} aria-hidden="true" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </>
        )}
      </div>

      {form && (() => {
        const f = form; const T = f.tried; const isClient = f.kind === 'client'; const isEdit = f.mode === 'edit';
        const ok = valid(f);
        const secHelp = ({ general: 'Used as a general reference', shipping: 'Used as an ordering reference', signatures: 'Used as a signature reference' } as Record<string, string>)[f.section];
        return (
          <Dialog
            title={(isEdit ? 'Edit ' : 'New ') + (isClient ? 'client' : 'helpful') + ' document'}
            description={isEdit ? 'Edit an existing document for clients to use as a reference.' : 'Create new documents for clients to use as reference.'}
            onClose={closeForm} maxWidth={560}
            actions={
              <div className={styles.formFoot}>
                {isEdit ? <button type="button" className="cc-btn cc-btn--tertiary" style={{ color: 'var(--error-700)' }} onClick={() => { const id = f.id!; closeForm(); setDel({ kind: f.kind, id }); }}>Delete</button> : <span />}
                <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                  <button type="button" className="cc-btn cc-btn--secondary" onClick={closeForm}>Cancel</button>
                  <button type="button" className="cc-btn cc-btn--primary" aria-disabled={!ok} onClick={submit}>{isEdit ? 'Save changes' : 'Add document'}</button>
                </div>
              </div>
            }
          >
            <div className={styles.formBody}>
              <h3 className={styles.formSec}><FilePlus size={16} aria-hidden="true" />Document details</h3>
              {isClient ? (
                <>
                  <div className="cc-field">
                    <label className="cc-label" htmlFor="dsf-org">Organization <span aria-hidden="true" className={styles.req}>*</span></label>
                    <DocsSigOrgPicker id="dsf-org" orgs={DOC_ORGS} value={f.org} onChange={(n) => patch({ org: n })} invalid={T && !f.org} describedBy={T && !f.org ? 'ds-f-org-err' : undefined} />
                    {T && !f.org && <p id="ds-f-org-err" className={styles.err}>Select an organization.</p>}
                  </div>
                  <div className="cc-field">
                    <label className="cc-label" htmlFor="ds-f-type">Document type <span aria-hidden="true" className={styles.req}>*</span></label>
                    <select id="ds-f-type" className="cc-input" value={f.type} onChange={(e) => patch({ type: e.target.value })} aria-required="true" aria-invalid={T && !f.type} aria-describedby={T && !f.type ? 'ds-f-type-err' : undefined}>
                      <option value="">Select a document type</option>
                      {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                    {T && !f.type && <p id="ds-f-type-err" className={styles.err}>Select a document type.</p>}
                  </div>
                </>
              ) : (
                <>
                  <div className="cc-field">
                    <label className="cc-label" htmlFor="ds-f-sec">Document section <span aria-hidden="true" className={styles.req}>*</span></label>
                    <select id="ds-f-sec" className="cc-input" value={f.section} onChange={(e) => patch({ section: e.target.value })} aria-required="true" aria-invalid={T && !f.section} aria-describedby="ds-f-sec-help">
                      <option value="">Select a section</option>
                      {DOC_SECTIONS.map(([k, n]) => <option key={k} value={k}>{n}</option>)}
                    </select>
                    <p id="ds-f-sec-help" className={T && !f.section ? styles.err : 'cc-hint'}>{T && !f.section ? 'Select a section.' : secHelp || 'Choose where this document appears.'}</p>
                  </div>
                  <div className="cc-field">
                    <label className="cc-label" htmlFor="ds-f-name">Document name <span aria-hidden="true" className={styles.req}>*</span></label>
                    <input id="ds-f-name" type="text" className="cc-input" maxLength={80} value={f.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Delivery and Shipping Guidelines" aria-required="true" aria-invalid={T && !f.name.trim()} aria-describedby={T && !f.name.trim() ? 'ds-f-name-err' : undefined} />
                    {T && !f.name.trim() && <p id="ds-f-name-err" className={styles.err}>Enter a document name.</p>}
                  </div>
                </>
              )}
              <div>
                <input ref={fileRef} type="file" accept=".xlsx,.pdf,.svg,.png,.jpg,.jpeg" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => { const fl = e.target.files?.[0]; if (fl) setFile(fl); e.target.value = ''; }} />
                <button type="button" className={styles.drop} data-drag={f.drag} data-err={T && !f.file}
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e: DragEvent) => { e.preventDefault(); if (!f.drag) patch({ drag: true }); }}
                  onDragLeave={() => patch({ drag: false })}
                  onDrop={(e: DragEvent) => { e.preventDefault(); const fl = e.dataTransfer?.files?.[0]; if (fl) setFile(fl); else patch({ drag: false }); }}>
                  <span aria-hidden="true" className={styles.dropIcon}><UploadCloud size={20} /></span>
                  <span className={styles.dropCta}><b>Click to upload</b> or drag and drop</span>
                  <span className={styles.dropHint}>XLSX, PDF, SVG, PNG, JPG (max. 50 MB)</span>
                </button>
                {f.fileErr && <p role="alert" className={styles.err}>{f.fileErr}</p>}
                {f.file && (
                  <div className={styles.fileCard}>
                    <div className={styles.fileTop}>
                      <div style={{ minWidth: 0 }}>
                        <div className={styles.fileName}>{f.file.name}</div>
                        <div role="status" className={styles.fileMeta}>
                          {fmtSize(Math.round(f.file.size * f.pct / 100))} of {fmtSize(f.file.size)}
                          <span aria-hidden="true" className={styles.pipe}>|</span>
                          {f.pct >= 100 ? <span className={styles.complete}><CheckCircle2 size={14} aria-hidden="true" />Complete</span> : <span>Uploading…</span>}
                        </div>
                      </div>
                      <button type="button" className="cc-icon-btn cc-icon-btn--xs" aria-label="Remove file" onClick={() => { window.clearInterval(timer.current); patch({ file: null, pct: 0 }); }}><Trash2 size={16} aria-hidden="true" /></button>
                    </div>
                    <div className={styles.progressRow}>
                      <div role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={f.pct} className={styles.track}><div className={styles.bar} style={{ width: f.pct + '%' }} /></div>
                      <span className={styles.fileName}>{f.pct}%</span>
                    </div>
                  </div>
                )}
              </div>
              {isClient && (
                <div className="cc-field">
                  <label className="cc-label" htmlFor="ds-f-desc">Description</label>
                  <textarea id="ds-f-desc" rows={4} maxLength={255} className="cc-input" style={{ height: 'auto', padding: 'var(--space-2_5) var(--space-3)', resize: 'vertical' }}
                    value={f.desc} onChange={(e) => patch({ desc: e.target.value.slice(0, 255) })} placeholder="Enter a description for this document..." aria-describedby="ds-f-desc-count" />
                  <p id="ds-f-desc-count" className="cc-hint" aria-live="polite">{f.desc.length}/255 characters used</p>
                </div>
              )}
            </div>
          </Dialog>
        );
      })()}

      {del && (() => {
        const d = del.kind === 'client' ? client.find((z) => z.id === del.id) : helpful.find((z) => z.id === del.id);
        if (!d) return null;
        const c = d as ClientDoc;
        const first = del.kind === 'client' ? c.events[c.events.length - 1] : undefined;
        return (
          <Dialog role="alertdialog" maxWidth={480}
            title={del.kind === 'client' ? 'Delete client document' : 'Delete helpful document'}
            description={del.kind === 'client' ? 'Are you sure you want to delete this document? It will be removed from this organization’s client documents and moved to Deleted.' : 'Are you sure you want to delete this document? It will be removed from helpful documents for all organizations.'}
            onClose={closeDel}
            actions={<>
              <button type="button" className="cc-btn cc-btn--secondary" onClick={() => setDel(null)}>Cancel</button>
              <button type="button" className="cc-btn cc-btn--destructive" onClick={confirmDelete}>Delete document</button>
            </>}
          >
            <div className={styles.delCard}>
              <FileIcon ext={d.ext} />
              <div style={{ minWidth: 0 }}>
                <div className={styles.docTitle}>{del.kind === 'client' ? `${c.type} | ${orgName(c.org)}` : (d as HelpfulDoc).name}</div>
                <div className={styles.subtitleSm}>{del.kind === 'client' ? c.desc || 'No description.' : d.fileName}</div>
                <div className={styles.helpMeta} style={{ marginTop: 'var(--space-2)' }}>{first ? first.who : d.who}<br />Uploaded {first ? first.when : d.when}.</div>
              </div>
            </div>
          </Dialog>
        );
      })()}

      {prev && (() => {
        const d = prev.kind === 'client' ? client.find((z) => z.id === prev.id) : helpful.find((z) => z.id === prev.id);
        if (!d) return null;
        const name = prev.kind === 'client' ? (d as ClientDoc).type : (d as HelpfulDoc).name;
        const where = prev.kind === 'client' ? orgName((d as ClientDoc).org) : 'All organizations';
        const pages = d.ext === 'pdf' && !d.blobUrl ? 3 : 1; const page = Math.min(prev.page, pages);
        const isImg = !!d.blobUrl && ['png', 'jpg', 'jpeg', 'svg'].includes(d.ext);
        const widths = ['92%', '86%', '95%', '70%', '88%', '60%', '94%', '82%', '76%', '90%', '58%', '84%'];
        const go = (p: number) => setPrev({ ...prev, page: p });
        return (
          <Dialog title="Preview" description={`${name} - ${where}`} onClose={closePrev} maxWidth={760}
            actions={<>
              {pages > 1 && <span role="status" className={styles.subtitleSm} style={{ marginRight: 'auto', alignSelf: 'center' }}>{page} of {pages}</span>}
              <button type="button" className="cc-btn cc-btn--secondary" onClick={() => setPrev(null)}>Close</button>
              <button type="button" className="cc-btn cc-btn--primary" onClick={() => download(d)}><Download size={18} aria-hidden="true" />Download</button>
            </>}
          >
            <div className={styles.stage} onKeyDown={(e) => { if (e.key === 'ArrowRight' && page < pages) go(page + 1); if (e.key === 'ArrowLeft' && page > 1) go(page - 1); }}>
              <button type="button" className={`cc-btn cc-btn--secondary cc-btn--sm ${styles.zoom}`} aria-label={prev.zoom ? 'Zoom out' : 'Zoom in'} onClick={() => setPrev({ ...prev, zoom: !prev.zoom })}>
                {prev.zoom ? <ZoomOut size={16} aria-hidden="true" /> : <ZoomIn size={16} aria-hidden="true" />}
              </button>
              {isImg ? (
                <img src={d.blobUrl} alt={`Preview of ${d.fileName}, page ${page}`} style={{ maxWidth: prev.zoom ? '160%' : '90%' }} />
              ) : (
                <div role="img" aria-label={`Preview of ${d.fileName}, page ${page}`} className={styles.page} style={{ width: prev.zoom ? 760 : 440 }}>
                  <div className={styles.pageTop}><span className={styles.brand}>Paradigm</span><span>Page {page}</span></div>
                  <div className={styles.pageRule} />
                  <div className={styles.pageName}>{name}</div>
                  <div className={styles.helpMeta}>{where}</div>
                  {widths.map((_, i) => <div key={i} className={styles.pageBar} style={{ width: widths[(i + page * 3) % widths.length], background: i % 5 === 2 ? 'var(--blue-50)' : 'var(--gray-100)' }} />)}
                  <div className={styles.helpMeta} style={{ marginTop: 'auto' }}>{d.fileName}</div>
                </div>
              )}
              {pages > 1 && (
                <>
                  <button type="button" className={styles.navBtn} style={{ left: 12, opacity: page <= 1 ? 0.4 : 1 }} aria-label="Previous page" aria-disabled={page <= 1} onClick={() => page > 1 && go(page - 1)}><ChevronLeft size={20} aria-hidden="true" /></button>
                  <button type="button" className={styles.navBtn} style={{ right: 12, opacity: page >= pages ? 0.4 : 1 }} aria-label="Next page" aria-disabled={page >= pages} onClick={() => page < pages && go(page + 1)}><ChevronRight size={20} aria-hidden="true" /></button>
                </>
              )}
            </div>
          </Dialog>
        );
      })()}
    </>
  );
}
