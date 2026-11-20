/* Add Organization: pick an organization from NAV and upload its logo.
   The shared store has no "add org" action yet, so submitting confirms with a toast and returns to Organizations. */

import { useEffect, useRef, useState, type DragEvent, type RefObject } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, CheckCircle2, ChevronDown, ChevronRight, Eye, GraduationCap, Search, Trash2, UploadCloud } from 'lucide-react';
import { NAV_ORGS } from '../data/orgProfile';
import { Dialog } from '../components/Dialog';
import { useToast } from '../components/Toast';
import { useDismiss } from '../components/useDismiss';
import styles from './AddOrganization.module.css';

type NavOrg = (typeof NAV_ORGS)[number];
interface LogoFile { name: string; size: number; url: string; pct: number }

const OK_TYPES = ['svg', 'png', 'jpg', 'jpeg', 'gif'];
const sizeText = (b: number) => (b >= 1024 * 1024 ? (b / 1024 / 1024).toFixed(1) + ' MB' : Math.max(1, Math.round(b / 1024)) + ' KB');

export function AddOrganization() {
  const navigate = useNavigate();
  const toast = useToast();
  const [sel, setSel] = useState<NavOrg | null>(null);
  const [listOpen, setListOpen] = useState(false);
  const [q, setQ] = useState('');
  const [logo, setLogo] = useState<LogoFile | null>(null);
  const [drag, setDrag] = useState(false);
  const [errs, setErrs] = useState<{ org?: boolean; logo?: boolean }>({});
  const [preview, setPreview] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const ddRef = useRef<HTMLDivElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useDismiss(listOpen, ddRef as RefObject<HTMLElement>, () => setListOpen(false));
  useEffect(() => () => window.clearInterval(timer.current), []);

  const opts = NAV_ORGS.filter((o) => { const s = q.trim().toLowerCase(); return !s || o.name.toLowerCase().includes(s) || String(o.num).includes(s); });
  const complete = !!logo && logo.pct >= 100;
  const valid = !!sel && complete;

  const pick = (o: NavOrg) => { setSel(o); setListOpen(false); setQ(''); setErrs((e) => ({ ...e, org: false })); };

  const setFile = (f: File | undefined) => {
    if (!f) return;
    const ext = (f.name.split('.').pop() || '').toLowerCase();
    if (!OK_TYPES.includes(ext)) { setErrs((e) => ({ ...e, logo: true })); return; }
    let url = '';
    try { url = URL.createObjectURL(f); } catch { /* preview unavailable */ }
    setLogo({ name: f.name, size: f.size, url, pct: 0 });
    setErrs((e) => ({ ...e, logo: false }));
    window.clearInterval(timer.current);
    timer.current = window.setInterval(() => {
      setLogo((l) => {
        if (!l) return l;
        const pct = Math.min(100, l.pct + 20);
        if (pct >= 100) window.clearInterval(timer.current);
        return { ...l, pct };
      });
    }, 150);
  };
  const startUpload = () => {
    if (!sel) { setErrs((e) => ({ ...e, org: true })); setListOpen(true); return; }
    fileRef.current?.click();
  };
  const onDrop = (e: DragEvent) => { e.preventDefault(); setDrag(false); if (!sel) { startUpload(); return; } setFile(e.dataTransfer.files[0]); };
  const removeLogo = () => { window.clearInterval(timer.current); setLogo(null); if (fileRef.current) fileRef.current.value = ''; };

  const submit = () => {
    const e = { org: !sel, logo: !complete };
    if (e.org || e.logo) { setErrs(e); return; }
    toast('Organization added', `(${sel!.num}) ${sel!.name} has been created.`);
    navigate('/organizations');
  };

  return (
    <div>
      <nav aria-label="Breadcrumb" className={`cc-scr ${styles.crumbs}`}>
        <button type="button" className={styles.crumbHome} onClick={() => navigate('/organizations')} aria-label="Organizations" title="Organizations">
          <GraduationCap size={20} aria-hidden="true" />
        </button>
        <ChevronRight size={16} color="var(--gray-500)" aria-hidden="true" />
        <span className={styles.crumbCurrent} aria-current="page">Add Organization</span>
      </nav>

      <div className={`cc-scr ${styles.body}`}>
        <h1 className={styles.title}>Add Organization</h1>
        <p className={styles.subtitle}>Select an organization from NAV to add a new organization to the platform.</p>

        <h2 className={styles.section}>Organization information</h2>
        <div className={styles.rule} />

        <div className={styles.form} style={{ padding: 'var(--space-5) 0 var(--space-6)' }}>
          <div className={styles.label} id="ao-org-label" style={{ minHeight: 40 }}>Organization<span className={styles.req} aria-hidden="true">*</span></div>
          <div className={styles.field}>
            <div ref={ddRef} style={{ position: 'relative' }}>
              <button
                type="button" className={`cc-btn cc-btn--secondary ${styles.ddBtn}`} onClick={() => setListOpen(!listOpen)}
                aria-haspopup="listbox" aria-expanded={listOpen} aria-labelledby="ao-org-label ao-org-value" aria-invalid={errs.org ? true : undefined}
                aria-describedby={errs.org ? 'ao-org-err' : undefined}
                style={errs.org ? { boxShadow: 'var(--shadow-xs), inset 0 0 0 1px var(--error-500)' } : undefined}
              >
                <span id="ao-org-value" className={styles.ddValue}>
                  {sel ? <><span className={styles.ddNum}>{sel.num}</span><span className={styles.ddName}>{sel.name}</span></> : <span className={styles.ddPh}>Select an organization</span>}
                </span>
                <ChevronDown size={18} color="var(--gray-500)" aria-hidden="true" />
              </button>
              {listOpen && (
                <div className={styles.menu}>
                  <div className={`cc-input cc-input--sm ${styles.search}`}>
                    <Search size={16} color="var(--gray-500)" aria-hidden="true" />
                    <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search NAV organizations" aria-label="Search NAV organizations" className={styles.searchInput} />
                  </div>
                  <div role="listbox" aria-label="Organizations in NAV" className={styles.list}>
                    {opts.map((o) => {
                      const on = sel?.num === o.num;
                      return (
                        <button key={o.num} type="button" role="option" aria-selected={on} className={styles.opt} onClick={() => pick(o)}>
                          <span className={styles.optNum}>{o.num}</span>
                          <span className={styles.optName} style={{ fontWeight: on ? 'var(--fw-semibold)' : 'var(--fw-medium)' }}>{o.name}</span>
                          {on && <Check size={16} color="var(--blue-600)" aria-hidden="true" style={{ marginLeft: 'auto', flexShrink: 0 }} />}
                        </button>
                      );
                    })}
                    {opts.length === 0 && <div className={styles.noResults}>No organizations match that search.</div>}
                  </div>
                </div>
              )}
            </div>
            {errs.org && <span id="ao-org-err" className={styles.err}>Select an organization from NAV.</span>}
          </div>

          <div className={styles.label} style={{ minHeight: 24 }}>Organization Name</div>
          <div className={styles.value} style={{ color: sel ? 'var(--gray-900)' : 'var(--gray-500)' }}>{sel ? sel.name : 'Select an organization to populate the name.'}</div>
        </div>

        <div className={styles.rule} />

        <div className={styles.form} style={{ padding: 'var(--space-6) 0 var(--space-2)' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div className={styles.label}>Logo<span className={styles.req} aria-hidden="true">*</span></div>
            {complete && logo!.url && <img src={logo!.url} alt={`${sel?.name ?? ''} logo`} className={styles.logoImg} />}
          </div>
          <div className={styles.field} style={{ gap: 'var(--space-3)' }}>
            <input ref={fileRef} type="file" accept=".svg,.png,.jpg,.jpeg,.gif" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => setFile(e.target.files?.[0])} />
            <button
              type="button" className={styles.dropzone} data-drag={drag || undefined} data-ready={(!!sel && !logo) || undefined}
              onClick={startUpload} onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={onDrop}
              aria-label="Upload a logo. SVG, PNG, JPG or GIF" aria-describedby={errs.logo ? 'ao-logo-err' : undefined}
            >
              <span className={styles.dzIcon} aria-hidden="true"><UploadCloud size={20} /></span>
              <span style={{ textAlign: 'center' }}>
                <span className={styles.dzLink}>Click to upload</span>
                <span className={styles.dzText}> or drag and drop</span>
                <span className={styles.dzHint}>SVG, PNG, JPG or GIF</span>
              </span>
            </button>
            {logo && (
              <div className={styles.fileCard}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.fileName}>{logo.name}</div>
                    <div role="status" className={styles.fileMeta}>
                      <span>{sizeText(logo.size)}</span>
                      {complete && <><span className={styles.sep} aria-hidden="true" /><span className={styles.complete}><CheckCircle2 size={15} aria-hidden="true" />Complete</span></>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--space-0_5)', flexShrink: 0 }}>
                    <button type="button" className="cc-icon-btn" aria-label="Remove file" title="Remove" onClick={removeLogo}><Trash2 size={17} aria-hidden="true" /></button>
                    <button type="button" className="cc-icon-btn" aria-label="Preview file" title="Preview" onClick={() => setPreview(true)} aria-disabled={!complete || !logo.url}><Eye size={17} aria-hidden="true" /></button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                  <div role="progressbar" aria-label="Upload progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={logo.pct} className={styles.bar}>
                    <div className={styles.barFill} style={{ width: logo.pct + '%' }} />
                  </div>
                  <span className={styles.pct}>{logo.pct}%</span>
                </div>
              </div>
            )}
            {errs.logo && <span id="ao-logo-err" className={styles.err}>Upload a logo file.</span>}
          </div>
        </div>

        <div className={styles.footer}>
          <button type="button" className="cc-btn cc-btn--secondary" onClick={() => navigate('/organizations')}>Cancel</button>
          <button type="button" className="cc-btn cc-btn--primary" aria-disabled={!valid} onClick={submit}>Add organization</button>
        </div>
      </div>

      {preview && logo?.url && complete && (
        <Dialog title={logo.name} onClose={() => setPreview(false)} actions={<button type="button" className="cc-btn cc-btn--secondary" onClick={() => setPreview(false)}>Close</button>}>
          <div className={styles.previewBox}><img src={logo.url} alt="Logo preview" style={{ maxWidth: '100%', maxHeight: 240, objectFit: 'contain' }} /></div>
        </Dialog>
      )}
    </div>
  );
}
