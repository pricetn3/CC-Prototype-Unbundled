/* Place new order: a stepper on the right edge, step 1 Order Details (organization, spreadsheet upload,
   contact, live ceremony) and step 2 Shipping & Billing (service, carrier, release timing, address, P.O.).
   Steps 3 and 4 are not built in the design yet. */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Check, CheckCircle2, ChevronLeft, Clock, Eye, FileText, Info, Mail, Plus, Trash2, Truck, UploadCloud, X } from 'lucide-react';
import { useStore } from '../data/store';
import type { Org } from '../data/orgs';
import { CARRIERS, SERVICE_TYPES, shipAddresses } from '../data/orders';
import { OrdersMenu } from '../components/OrdersMenu';
import { useToast } from '../components/Toast';
import styles from './PlaceOrder.module.css';

const STEPS = ['Order Details', 'Shipping & Billing', 'Signatures & Titles', 'Review'];

function ord(n: number) { const s = ['th', 'st', 'nd', 'rd']; const v = n % 100; return n + (s[(v - 20) % 10] || s[v] || s[0]); }
function longDate(d: Date) {
  return `${d.toLocaleDateString('en-US', { weekday: 'long' })}, ${d.toLocaleDateString('en-US', { month: 'short' })} ${ord(d.getDate())}, ${d.getFullYear()}`;
}
function addDays(n: number) { const d = new Date(); d.setDate(d.getDate() + n); return d; }
function shipBy(days: number) { return days === 0 ? 'today, ' + longDate(new Date()) : longDate(addDays(days)); }
function etNow() {
  const d = new Date();
  const t = d.toLocaleTimeString('en-US', { timeZone: 'America/New_York', hour: 'numeric', minute: '2-digit', hour12: true });
  const dt = d.toLocaleDateString('en-US', { timeZone: 'America/New_York', month: '2-digit', day: '2-digit', year: '2-digit' });
  return t + ' ET, ' + dt;
}
function phoneFmt(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 10);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `(${d.slice(0, 3)}) ${d.slice(3)}`;
  return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
}

type Errs = Record<string, boolean>;

function Req() { return <span className={styles.req} aria-hidden="true">*</span>; }
function Err({ id, show, children }: { id: string; show: boolean; children: string }) {
  return show ? <span id={id} className={styles.err}>{children}</span> : null;
}

export function PlaceOrder() {
  const navigate = useNavigate();
  const toast = useToast();
  const { orgs } = useStore();
  const [step, setStep] = useState(1);
  const [time, setTime] = useState(etNow);
  useEffect(() => { const t = window.setInterval(() => setTime(etNow()), 30000); return () => window.clearInterval(t); }, []);

  // Step 1
  const [org, setOrg] = useState<Org | null>(null);
  const [banner, setBanner] = useState(true);
  const [file, setFile] = useState<{ name: string; total: number; pct: number } | null>(null);
  const [drag, setDrag] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [live, setLive] = useState(false);
  const [ceremony, setCeremony] = useState('');
  const [inHand, setInHand] = useState('');
  const [errs, setErrs] = useState<Errs>({});
  const timer = useRef<number | null>(null);
  useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

  // Step 2
  const [service, setService] = useState<string | null>(null);
  const [ack, setAck] = useState(false);
  const [carrier, setCarrier] = useState<string | null>(null);
  const [release, setRelease] = useState<'onship' | 'delay'>('onship');
  const [delayDate, setDelayDate] = useState('');
  const [paperDismissed, setPaperDismissed] = useState(false);
  const [addrIdx, setAddrIdx] = useState(0);
  const [po, setPo] = useState<'no' | 'yes'>('no');
  const [poKind, setPoKind] = useState<'standing' | 'individual' | null>(null);
  const [poNum, setPoNum] = useState('');
  const [errs2, setErrs2] = useState<Errs>({});

  const clr = (k: string) => setErrs((e) => ({ ...e, [k]: false }));
  const clr2 = (k: string) => setErrs2((e) => ({ ...e, [k]: false }));

  const startUpload = () => {
    if (timer.current) window.clearInterval(timer.current);
    setFile({ name: '2025-SummerGrad.xlsx', total: 200, pct: 0 });
    setDrag(false);
    clr('file');
    timer.current = window.setInterval(() => {
      setFile((f) => {
        if (!f) return f;
        const pct = Math.min(100, f.pct + 20);
        if (pct >= 100 && timer.current) { window.clearInterval(timer.current); timer.current = null; }
        return { ...f, pct };
      });
    }, 180);
  };

  const step1Errs = (): Errs => {
    const e: Errs = {};
    if (!org) e.org = true;
    if (!file || file.pct < 100) e.file = true;
    if (!name.trim()) e.name = true;
    if (phone.replace(/\D/g, '').length !== 10) e.phone = true;
    if (live) { if (!ceremony) e.ceremony = true; if (!inHand) e.inhand = true; }
    return e;
  };
  const step2Errs = (): Errs => {
    const e: Errs = {};
    if (!service) e.service = true;
    if (service && service !== 'standard') { if (!ack) e.ack = true; if (!carrier) e.carrier = true; }
    if (release === 'delay' && !delayDate) e.delay = true;
    if (po === 'yes') { if (!poKind) e.poKind = true; if (poKind === 'individual' && !poNum.trim()) e.poNum = true; }
    return e;
  };
  const valid1 = Object.keys(step1Errs()).length === 0;
  const valid2 = Object.keys(step2Errs()).length === 0;

  const onContinue1 = () => { const e = step1Errs(); if (Object.keys(e).length) { setErrs(e); return; } setErrs2({}); setStep(2); };
  const onContinue2 = () => { const e = step2Errs(); if (Object.keys(e).length) { setErrs2(e); return; } toast('Shipping & billing saved', 'Step 3 — Signatures & Titles is not built yet.'); };

  const addrs = shipAddresses(org?.email).filter((a) => !a.archived);
  const addr = addrs[Math.min(addrIdx, addrs.length - 1)];
  const curSvc = SERVICE_TYPES.find((s) => s.key === service) ?? SERVICE_TYPES[0];
  const expedited = !!service && service !== 'standard';

  return (
    <>
      <div className={`cc-scr ${styles.topbar}`}>
        <button type="button" className={styles.back} onClick={() => navigate('/orders')}><ChevronLeft size={16} aria-hidden="true" />Cancel</button>
        <button type="button" className="cc-btn cc-btn--secondary" onClick={() => toast('Contact Client Relations', 'clientrelations@paradigm-corp.com')}><Mail size={16} aria-hidden="true" />Contact Client Relations</button>
      </div>

      <div className={`cc-scr ${styles.body}`}>
        <h1 className={styles.title}>Place New Order</h1>
        <div className={styles.meta}>
          <span className={styles.live}><span className={styles.dot} aria-hidden="true" />Orders will process today</span>
          <span className={styles.time}><Clock size={14} aria-hidden="true" />Paradigm time: {time}</span>
        </div>

        <div className={styles.split}>
          <div className={styles.form}>
            {step === 1 && (
              <>
                <div className={styles.stepHead}>
                  <div className={styles.stepHeadMain}>
                    <span className={styles.stepIcon} aria-hidden="true"><FileText size={24} /></span>
                    <div>
                      <h2 className={styles.stepTitle}>Order Details</h2>
                      <p className={styles.stepDesc}>Upload your order spreadsheet and provide order information.</p>
                    </div>
                  </div>
                  <div className={styles.stepActions}>
                    <button type="button" className="cc-btn cc-btn--primary" aria-disabled={!valid1} onClick={onContinue1}>Continue</button>
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.rowLabel} id="no-org-lbl">Organization<Req /></div>
                  <div className={styles.field}>
                    <OrdersMenu
                      id="no-org"
                      ariaLabel={org ? `Organization: ${org.num} ${org.name}` : 'Organization, required'}
                      buttonClassName={`cc-btn cc-btn--secondary ${styles.pickBtn}`}
                      buttonLabel={org ? <span><span className={styles.orgNum}>{org.num}</span>{org.name}</span> : <span className={styles.placeholder}>Select an organization</span>}
                      options={orgs.map((o) => ({ value: o.id, label: o.name, meta: String(o.num) }))}
                      value={org?.id ?? null}
                      onChange={(id) => { setOrg(orgs.find((o) => o.id === id) ?? null); setAddrIdx(0); clr('org'); }}
                      menuWidth="100%"
                      searchPlaceholder="Search organizations"
                      emptyText="No organizations match that search."
                      invalid={errs.org}
                      describedBy={errs.org ? 'no-org-err' : undefined}
                    />
                    <Err id="no-org-err" show={!!errs.org}>Select an organization.</Err>
                  </div>
                </div>

                <div className={styles.row}>
                  <div>
                    <div className={styles.rowLabel}>Order Spreadsheet<Req /></div>
                    <p className={styles.rowHint}>Documents will be mailed directly to recipients with addresses included. Remove individual addresses for bulk shipments.</p>
                  </div>
                  <div className={styles.field}>
                    {banner && (
                      <div className="cc-alert cc-alert--info" role="note">
                        <Info className="cc-alert__icon" aria-hidden="true" />
                        <div className="cc-alert__body">
                          <p className="cc-alert__title">Confirm file completion and accuracy</p>
                          <p className="cc-alert__message">Please check carefully for any hidden or unintended data. Paradigm will process all records as provided.</p>
                        </div>
                        <button type="button" className="cc-icon-btn cc-icon-btn--xs cc-alert__close" aria-label="Dismiss" onClick={() => setBanner(false)}><X size={16} aria-hidden="true" /></button>
                      </div>
                    )}
                    <button
                      type="button"
                      className={`${styles.dropzone} ${drag ? styles.dzDrag : ''} ${errs.file ? styles.dzErr : ''}`}
                      onClick={startUpload}
                      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
                      onDragLeave={() => setDrag(false)}
                      onDrop={(e) => { e.preventDefault(); startUpload(); }}
                      aria-describedby={errs.file ? 'no-file-err' : undefined}
                    >
                      <span className={styles.dzIcon} aria-hidden="true"><UploadCloud size={20} /></span>
                      <span>
                        <span className={styles.dzLink}>Click to upload</span> or drag and drop
                        <span className={styles.dzTypes}>XLS, XLSX, DOC, PDF</span>
                      </span>
                    </button>
                    {file && (
                      <div className={styles.file}>
                        <div className={styles.fileTop}>
                          <div>
                            <div className={styles.fileName}>{file.name}</div>
                            <div className={styles.fileMeta}>
                              <span>{Math.round(file.total * file.pct / 100)} KB of {file.total} KB</span>
                              {file.pct >= 100 && (<><span className={styles.sep} aria-hidden="true" /><span className={styles.complete}><CheckCircle2 size={15} aria-hidden="true" />Complete</span></>)}
                            </div>
                          </div>
                          <div className={styles.fileActions}>
                            <button type="button" className="cc-icon-btn cc-icon-btn--xs" aria-label="Preview file" title="Preview" onClick={() => toast('Preview', 'File preview is not available in this prototype.')}><Eye size={16} aria-hidden="true" /></button>
                            <button type="button" className="cc-icon-btn cc-icon-btn--xs" aria-label="Delete file" title="Delete" onClick={() => { if (timer.current) { window.clearInterval(timer.current); timer.current = null; } setFile(null); }}><Trash2 size={16} aria-hidden="true" /></button>
                          </div>
                        </div>
                        <div className={styles.bar}>
                          <div className={styles.track} role="progressbar" aria-label="Upload progress" aria-valuenow={file.pct} aria-valuemin={0} aria-valuemax={100}>
                            <div className={styles.fill} style={{ width: file.pct + '%' }} />
                          </div>
                          <span>{file.pct}%</span>
                        </div>
                      </div>
                    )}
                    <Err id="no-file-err" show={!!errs.file}>Upload your order spreadsheet.</Err>
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.rowLabel}>Contact Details<Req /></div>
                  <div className={`${styles.g2} ${styles.field}`}>
                    <div className="cc-field">
                      <label className="cc-label" htmlFor="no-name">Name</label>
                      <input id="no-name" className="cc-input" value={name} placeholder="Olivia Rhye" aria-invalid={errs.name || undefined} aria-describedby={errs.name ? 'no-name-err' : undefined} onChange={(e) => { setName(e.target.value); clr('name'); }} />
                      <Err id="no-name-err" show={!!errs.name}>Enter a contact name.</Err>
                    </div>
                    <div className="cc-field">
                      <label className="cc-label" htmlFor="no-phone">Phone</label>
                      <input
                        id="no-phone" className="cc-input" type="tel" value={phone} placeholder="(123) 456-7890"
                        aria-invalid={errs.phone || undefined} aria-describedby={errs.phone ? 'no-phone-err' : undefined}
                        onChange={(e) => { setPhone(phoneFmt(e.target.value)); clr('phone'); }}
                        onBlur={() => { const d = phone.replace(/\D/g, ''); if (d.length && d.length !== 10) setErrs((x) => ({ ...x, phone: true })); }}
                      />
                      <Err id="no-phone-err" show={!!errs.phone}>Enter a 10-digit phone number.</Err>
                    </div>
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.rowLabel}>Live Ceremony</div>
                  <div className={styles.field}>
                    <label className="cc-checkbox">
                      <input className="cc-checkbox__input" type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
                      This order is for a live ceremony.
                    </label>
                    {live && (
                      <div className={styles.g2}>
                        <div className="cc-field">
                          <label className="cc-label" htmlFor="no-cer">Ceremony date</label>
                          <input id="no-cer" type="date" className="cc-input" value={ceremony} aria-invalid={errs.ceremony || undefined} aria-describedby={errs.ceremony ? 'no-cer-err' : undefined} onChange={(e) => { setCeremony(e.target.value); clr('ceremony'); }} />
                          <Err id="no-cer-err" show={!!errs.ceremony}>Select a ceremony date.</Err>
                        </div>
                        <div className="cc-field">
                          <label className="cc-label" htmlFor="no-inhand">In-hand date</label>
                          <input id="no-inhand" type="date" className="cc-input" value={inHand} aria-invalid={errs.inhand || undefined} aria-describedby={errs.inhand ? 'no-inhand-err' : undefined} onChange={(e) => { setInHand(e.target.value); clr('inhand'); }} />
                          <Err id="no-inhand-err" show={!!errs.inhand}>Select an in-hand date.</Err>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className={styles.stepHead}>
                  <div className={styles.stepHeadMain}>
                    <span className={styles.stepIcon} aria-hidden="true"><Truck size={24} /></span>
                    <div>
                      <h2 className={styles.stepTitle}>Shipping &amp; Billing</h2>
                      <p className={styles.stepDesc}>
                        Check <a className="cc-link" href="https://about.usps.com/newsroom/service-alerts/" target="_blank" rel="noreferrer">USPS Service Alerts</a> and{' '}
                        <a className="cc-link" href="https://www.ups.com" target="_blank" rel="noreferrer">UPS.com</a> for the latest international shipping updates. Mail items for suspended countries will be returned to the organization in individual mailers.
                      </p>
                    </div>
                  </div>
                  <div className={styles.stepActions}>
                    <button type="button" className="cc-btn cc-btn--secondary" onClick={() => setStep(1)}>Previous</button>
                    <button type="button" className="cc-btn cc-btn--primary" aria-disabled={!valid2} onClick={onContinue2}>Continue</button>
                  </div>
                </div>

                <div className={styles.row}>
                  <div>
                    <div className={styles.rowLabel} id="s2-svc-lbl">Service Type<Req /></div>
                    <p className={styles.rowHint}>Daily processing closes at 1:00 PM ET.</p>
                  </div>
                  <div className={styles.field} role="radiogroup" aria-labelledby="s2-svc-lbl" aria-describedby={errs2.service ? 's2-svc-err' : undefined}>
                    {SERVICE_TYPES.map((s) => (
                      <label key={s.key} className="cc-option-card" style={errs2.service ? { borderColor: 'var(--error-500)' } : undefined}>
                        <input
                          className="cc-option-card__input" type="radio" name="s2-service" checked={service === s.key}
                          onChange={() => { setService(s.key); if (s.key === 'standard') { setAck(false); setCarrier(null); } clr2('service'); }}
                        />
                        <span className="cc-option-card__body">
                          <span className="cc-option-card__title">{s.title}</span>
                          <span className="cc-option-card__meta">Ship by {shipBy(s.days)}</span>
                        </span>
                        <span className="cc-option-card__end" style={{ fontWeight: 'var(--fw-regular)', color: 'var(--fg-secondary)', maxWidth: 200, textAlign: 'right' }}>{s.price}</span>
                      </label>
                    ))}
                    <Err id="s2-svc-err" show={!!errs2.service}>Select a service type.</Err>
                    {expedited && (
                      <>
                        <label className="cc-checkbox">
                          <input className="cc-checkbox__input" type="checkbox" checked={ack} aria-invalid={errs2.ack || undefined} aria-describedby={errs2.ack ? 's2-ack-err' : undefined} onChange={(e) => { setAck(e.target.checked); clr2('ack'); }} />
                          I acknowledge that additional fees and carrier charges may apply when selecting expedited services.
                        </label>
                        <Err id="s2-ack-err" show={!!errs2.ack}>Acknowledge the expedited service terms.</Err>
                      </>
                    )}
                  </div>
                </div>

                {expedited && (
                  <div className={styles.row}>
                    <div className={styles.rowLabel}>Shipping Carrier<Req /></div>
                    <div className={styles.field}>
                      <OrdersMenu
                        id="s2-carrier"
                        ariaLabel={carrier ? `Shipping carrier: ${carrier}` : 'Shipping carrier, required'}
                        buttonClassName={`cc-btn cc-btn--secondary ${styles.pickBtn}`}
                        buttonLabel={carrier ?? <span className={styles.placeholder}>Select shipping carrier</span>}
                        options={CARRIERS.map((c) => ({ value: c, label: c }))}
                        value={carrier}
                        onChange={(c) => { setCarrier(c); clr2('carrier'); }}
                        menuWidth="100%"
                        invalid={errs2.carrier}
                        describedBy={errs2.carrier ? 's2-carrier-err' : undefined}
                      />
                      <Err id="s2-carrier-err" show={!!errs2.carrier}>Select a shipping carrier.</Err>
                    </div>
                  </div>
                )}

                <div className={styles.row}>
                  <div>
                    <div className={styles.rowLabel} id="s2-rel-lbl">Digital Credential Release<Req /></div>
                    <p className={styles.rowHint}>All releases occur at 1 PM ET.</p>
                  </div>
                  <div className={styles.field}>
                    <fieldset className={styles.radios} aria-labelledby="s2-rel-lbl">
                      <label className="cc-radio">
                        <input className="cc-radio__input" type="radio" name="s2-release" checked={release === 'onship'} onChange={() => { setRelease('onship'); clr2('delay'); }} />
                        <span>Release on or before ship date: <span className={release === 'onship' ? styles.shipDate : undefined}>{shipBy(curSvc.days)}</span></span>
                      </label>
                      <label className="cc-radio">
                        <input className="cc-radio__input" type="radio" name="s2-release" checked={release === 'delay'} onChange={() => setRelease('delay')} />
                        <span>Delay release date{delayDate ? ': ' + longDate(new Date(delayDate + 'T12:00')) : ''}</span>
                      </label>
                    </fieldset>
                    {release === 'delay' && (
                      <>
                        <div className="cc-field" style={{ maxWidth: 240 }}>
                          <label className="sr-only" htmlFor="s2-delay">Delayed release date</label>
                          <input id="s2-delay" type="date" className="cc-input" value={delayDate} aria-invalid={errs2.delay || undefined} aria-describedby={'s2-delay-hint' + (errs2.delay ? ' s2-delay-err' : '')} onChange={(e) => { setDelayDate(e.target.value); clr2('delay'); }} />
                          <span id="s2-delay-hint" className="cc-hint">Do not select a weekend or holiday.</span>
                          <Err id="s2-delay-err" show={!!errs2.delay}>Select a delayed release date.</Err>
                        </div>
                        {file && !paperDismissed && (
                          <div className="cc-alert cc-alert--warning" role="note">
                            <AlertCircle className="cc-alert__icon" aria-hidden="true" />
                            <div className="cc-alert__body">
                              <p className="cc-alert__title">Submit paper documents separately</p>
                              <p className="cc-alert__message">Order spreadsheets requesting a delayed digital release cannot contain paper credentials. Please submit these in a separate order.</p>
                            </div>
                            <button type="button" className="cc-icon-btn cc-icon-btn--xs cc-alert__close" aria-label="Dismiss" onClick={() => setPaperDismissed(true)}><X size={16} aria-hidden="true" /></button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.rowLabel}>Shipping Address<Req /></div>
                  <div className={styles.field}>
                    {addr && (
                      <div className={styles.addr}>
                        <span className={styles.addrName}>{addr.name}{addrIdx === 0 && <span className="cc-badge cc-badge--square cc-badge--success">Default</span>}</span>
                        <span style={{ color: 'var(--gray-700)' }}>{addr.line1}</span>
                        {addr.line2 && <span>{addr.line2}</span>}
                        <span>{addr.cityLine}</span>
                        <span>{addr.contact}</span>
                        <span style={{ color: 'var(--gray-500)' }}>{addr.email}</span>
                      </div>
                    )}
                    <OrdersMenu
                      id="s2-addr"
                      buttonClassName="cc-link cc-link-btn"
                      buttonStyle={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1_5)' }}
                      icon={<Plus size={16} aria-hidden="true" />}
                      buttonLabel="Select different address"
                      hideChevron
                      options={addrs.map((a, i) => ({ value: String(i), label: a.name, sub: `${a.line1} · ${a.cityLine}` }))}
                      value={String(addrIdx)}
                      onChange={(v) => setAddrIdx(Number(v))}
                      menuWidth={360}
                    />
                  </div>
                </div>

                <div className={styles.row}>
                  <div className={styles.rowLabel} id="s2-po-lbl">Purchase Order Required<Req /></div>
                  <div className={styles.field}>
                    <div className={styles.seg} role="group" aria-labelledby="s2-po-lbl">
                      <button type="button" className={styles.segBtn} aria-pressed={po === 'no'} onClick={() => { setPo('no'); setPoKind(null); setPoNum(''); clr2('poKind'); clr2('poNum'); }}>No</button>
                      <button type="button" className={styles.segBtn} aria-pressed={po === 'yes'} onClick={() => setPo('yes')}>Yes</button>
                    </div>
                    {po === 'yes' && (
                      <>
                        <fieldset className={styles.radios} aria-label="Purchase order type" aria-describedby={errs2.poKind ? 's2-pok-err' : undefined}>
                          <label className="cc-radio">
                            <input className="cc-radio__input" type="radio" name="s2-pokind" checked={poKind === 'standing'} onChange={() => { setPoKind('standing'); setPoNum(''); clr2('poKind'); clr2('poNum'); }} />
                            Standing/Blanket P.O.
                          </label>
                          <label className="cc-radio">
                            <input className="cc-radio__input" type="radio" name="s2-pokind" checked={poKind === 'individual'} onChange={() => { setPoKind('individual'); clr2('poKind'); }} />
                            Individual/Per Order P.O.
                          </label>
                        </fieldset>
                        <Err id="s2-pok-err" show={!!errs2.poKind}>Choose a purchase order type.</Err>
                        {poKind === 'individual' && (
                          <div className="cc-field" style={{ maxWidth: 320 }}>
                            <label className="sr-only" htmlFor="s2-ponum">Purchase order number</label>
                            <input id="s2-ponum" className="cc-input" value={poNum} placeholder="1234567890" aria-invalid={errs2.poNum || undefined} aria-describedby={errs2.poNum ? 's2-ponum-err' : undefined} onChange={(e) => { setPoNum(e.target.value); clr2('poNum'); }} />
                            <Err id="s2-ponum-err" show={!!errs2.poNum}>Enter the purchase order number.</Err>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          <ol className={styles.stepper} aria-label="Order steps">
            {STEPS.map((label, i) => {
              const n = i + 1; const done = n < step; const cur = n === step;
              return (
                <li key={label} className={styles.step} aria-current={cur ? 'step' : undefined}>
                  <div className={styles.stepRail}>
                    <span className={`${styles.num} ${done ? styles.numDone : cur ? styles.numCur : ''}`} aria-hidden="true">
                      {done ? <Check size={15} /> : n}
                    </span>
                    {i < STEPS.length - 1 && <span className={styles.line} aria-hidden="true" />}
                  </div>
                  <span className={`${styles.stepLabel} ${done || cur ? styles.stepLabelOn : ''} ${cur ? styles.stepLabelCur : ''}`}>
                    {label}<span className="sr-only">{done ? ', complete' : cur ? ', current step' : ''}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </>
  );
}
