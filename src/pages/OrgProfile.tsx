/* Organization profile: header, tabs, and the Details tab (view and edit, setup status, settings summary,
   deactivate / reactivate). The other tabs live in ./org-profile. */

import { useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Check, ChevronRight, Clock, Copy, GraduationCap } from 'lucide-react';
import { useStore } from '../data/store';
import { avatarTone, initials, orgLogo, settingsSummary, type Org } from '../data/orgs';
import { SegTabs } from '../components/SegTabs';
import { StatusIcon } from '../components/StatusIcon';
import { Dialog } from '../components/Dialog';
import { useToast } from '../components/Toast';
import { NotBuilt } from './NotBuilt';
import { ShippingTab } from './org-profile/ShippingTab';
import { BillingTab } from './org-profile/BillingTab';
import { ContactsTab } from './org-profile/ContactsTab';
import { PunctuationTab } from './org-profile/PunctuationTab';
import { SettingsTab } from './org-profile/SettingsTab';
import styles from './OrgProfile.module.css';

type TabKey = 'details' | 'shipping' | 'billing' | 'contacts' | 'punctuation' | 'settings';
const TABS: { key: TabKey; label: string }[] = [
  { key: 'details', label: 'Details' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'billing', label: 'Billing' },
  { key: 'contacts', label: 'Contacts' },
  { key: 'punctuation', label: 'Punctuation Data' },
  { key: 'settings', label: 'Settings' },
];

export function OrgProfile() {
  const { orgNum } = useParams();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { orgs } = useStore();
  const org = orgs.find((o) => String(o.num) === orgNum);
  const tab = (TABS.find((t) => t.key === params.get('tab'))?.key ?? 'details') as TabKey;
  const setTab = (t: TabKey) => setParams(t === 'details' ? {} : { tab: t }, { replace: true });

  if (!org) return <NotBuilt title="Organization not found" text={`There's no organization with ID ${orgNum}.`} />;

  const logo = orgLogo(org);
  const tone = avatarTone(org);

  return (
    <div key={org.id}>
      <nav aria-label="Breadcrumb" className={`cc-scr ${styles.crumbs}`}>
        <button type="button" className={styles.crumbHome} onClick={() => navigate('/organizations')} aria-label="Organizations" title="Organizations">
          <GraduationCap size={20} aria-hidden="true" />
        </button>
        <ChevronRight size={16} color="var(--gray-500)" aria-hidden="true" />
        <span className={styles.crumbCurrent} aria-current="page">Organization Profile</span>
      </nav>

      <div className={`cc-scr ${styles.header}`}>
        <div>
          <h1 className={styles.title}>
            {org.name}
            {org.status === 'inactive' && <span className="cc-badge"><span className="cc-badge__dot" style={{ background: 'var(--gray-400)' }} aria-hidden="true" />Inactive</span>}
            {org.status === 'hold' && <span className="cc-badge cc-badge--error"><span className="cc-badge__dot" style={{ background: 'var(--error-500)' }} aria-hidden="true" />On hold</span>}
          </h1>
          <p className={styles.subtitle}>View and manage organization details.</p>
        </div>
        {logo
          ? <img src={logo} alt={`${org.name} logo`} className={styles.logo} />
          : <span className={styles.initials} style={{ background: tone.bg, color: tone.fg }} aria-hidden="true">{initials(org.name)}</span>}
      </div>

      <div className={`cc-scr ${styles.tabs}`}>
        <SegTabs tabs={TABS} value={tab} onChange={setTab} label="Organization profile sections" />
      </div>

      <div className={`cc-scr ${styles.body}`}>
        {tab === 'details' && <DetailsTab org={org} onTab={setTab} />}
        {tab === 'shipping' && <ShippingTab org={org} />}
        {tab === 'billing' && <BillingTab org={org} />}
        {tab === 'contacts' && <ContactsTab org={org} />}
        {tab === 'punctuation' && <PunctuationTab />}
        {tab === 'settings' && <SettingsTab org={org} />}
      </div>
    </div>
  );
}

/* ---------------- Details tab ---------------- */

const FIELDS: { key: 'contactName' | 'email'; label: string; type: 'text' | 'email' }[] = [
  { key: 'contactName', label: 'Primary Contact Name', type: 'text' },
  { key: 'email', label: 'Primary Contact Email', type: 'email' },
];

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function validate(v: Record<string, string>) {
  const err: Record<string, string> = {};
  if (!v.contactName.trim()) err.contactName = 'Enter the primary contact’s name.';
  if (!EMAIL_RE.test(v.email.trim())) err.email = 'Enter a valid email address, like name@school.edu.';
  return err;
}

const REASONS = [
  { value: 'offboarding', label: 'Off boarding' },
  { value: 'nonpayment', label: 'Blocked for non-payment' },
  { value: 'admin', label: 'Blocked for administrative' },
];

function DetailsTab({ org, onTab }: { org: Org; onTab: (t: TabKey) => void }) {
  const { updateOrg } = useStore();
  const toast = useToast();
  const inactive = org.status === 'inactive';

  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [tried, setTried] = useState(false);
  const [copied, setCopied] = useState(false);
  const [statusDialog, setStatusDialog] = useState<null | 'deactivate' | 'reactivate'>(null);
  const [reason, setReason] = useState('');

  const errors = draft && tried ? validate(draft) : {};
  const startEdit = () => { if (inactive) return; setDraft({ contactName: org.contactName, email: org.email }); setTried(false); };
  const cancel = () => { setDraft(null); setTried(false); };
  const save = () => {
    if (!draft) return;
    setTried(true);
    if (Object.keys(validate(draft)).length) return;
    updateOrg(org.id, { contactName: draft.contactName.trim(), email: draft.email.trim() });
    setDraft(null);
    setTried(false);
    toast('Changes saved', `Organization details for ${org.name} were updated.`);
  };
  const copyEmail = () => {
    navigator.clipboard?.writeText(org.email).catch(() => {});
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  const confirmStatus = () => {
    const isD = statusDialog === 'deactivate';
    if (isD && !reason) return;
    // Status changes aren't recorded in Admin › Action log (it covers Countries and each org's Settings tab).
    updateOrg(org.id, { status: isD ? 'inactive' : 'active' });
    setStatusDialog(null);
    setReason('');
    setDraft(null);
    toast(
      isD ? 'Successfully deactivated organization' : 'Successfully reactivated organization',
      isD
        ? `(${org.num}) ${org.name} has been deactivated and will no longer have access to the platform.`
        : `(${org.num}) ${org.name} has been reactivated. Please reactivate a user who can invite their team.`,
    );
  };

  const sum = settingsSummary(org);
  const statusRows = [
    { label: 'Shipping', ok: org.setup.shipping, by: org.shipBy, tab: 'shipping' as const },
    { label: 'Billing', ok: org.setup.billing, by: org.billBy, tab: 'billing' as const },
    { label: 'Punctuation Data', ok: org.setup.punctuation, by: org.punctBy, tab: 'punctuation' as const },
  ];

  return (
    <>
      <div className={styles.sectionHead}>
        <h2 className={styles.sectionTitle}>Organization details</h2>
        <div className={styles.sectionActions}>
          {draft ? (
            <>
              <button type="button" className="cc-btn cc-btn--secondary" onClick={cancel}>Cancel</button>
              <button type="button" className="cc-btn cc-btn--primary" onClick={save}>Save changes</button>
            </>
          ) : (
            <button type="button" className="cc-btn cc-btn--secondary" onClick={startEdit} aria-disabled={inactive} title={inactive ? 'Reactivate this organization to edit it' : undefined}>Edit</button>
          )}
        </div>
      </div>

      <div className={styles.split}>
        <div>
          <div className={`${styles.kv} ${styles.kvTop}`}>
            <div className={styles.k}>Organization</div>
            <div className={styles.v}>{org.name}</div>
            <div className={styles.k}>Organization ID</div>
            <div className={styles.v} style={{ fontVariantNumeric: 'tabular-nums' }}>{org.num}</div>
          </div>

          <div className={styles.kv} style={{ alignItems: 'center' }}>
            <div className={styles.k}>Logo</div>
            <div>
              <button type="button" className="cc-btn cc-btn--secondary cc-btn--sm" aria-disabled={inactive}>
                {orgLogo(org) ? 'Replace logo' : 'Upload logo'}
              </button>
            </div>
          </div>

          {FIELDS.map((f) => {
            const err = errors[f.key];
            const id = `op-f-${f.key}`;
            return (
              <div key={f.key} className={styles.kv} style={{ alignItems: draft ? 'start' : 'center' }}>
                <label htmlFor={draft ? id : undefined} className={styles.k}>
                  {f.label}{draft && <span aria-hidden="true" style={{ color: 'var(--blue-600)' }}>*</span>}
                </label>
                <div>
                  {draft ? (
                    <>
                      <input
                        id={id}
                        type={f.type}
                        className="cc-input"
                        style={{ maxWidth: 400 }}
                        value={draft[f.key]}
                        onChange={(e) => setDraft({ ...draft, [f.key]: e.target.value })}
                        aria-required="true"
                        aria-invalid={err ? 'true' : 'false'}
                        aria-describedby={err ? `${id}-err` : undefined}
                      />
                      {err && <p id={`${id}-err`} className={styles.err}>{err}</p>}
                    </>
                  ) : f.type === 'email' && org.email ? (
                    <span className={styles.emailRow}>
                      <a href={`mailto:${org.email}`} className="cc-link" style={{ fontSize: 'var(--text-smed-size)', lineHeight: 'var(--text-smed-lh)', overflowWrap: 'anywhere' }}>{org.email}</a>
                      <button type="button" className="cc-icon-btn cc-icon-btn--xs" onClick={copyEmail} title={copied ? 'Copied' : 'Copy'} aria-label={`Copy ${f.label.toLowerCase()}`}>
                        {copied ? <Check size={15} color="var(--gray-500)" aria-hidden="true" /> : <Copy size={15} aria-hidden="true" />}
                      </button>
                      <span role="status" className="sr-only">{copied ? 'Copied to clipboard' : ''}</span>
                    </span>
                  ) : (
                    <span className={styles.v}>{org[f.key] || '—'}</span>
                  )}
                </div>
              </div>
            );
          })}

          {statusRows.map((r) => (
            <div key={r.label} className={styles.kv}>
              <div>
                <div className={styles.k}>{r.label}</div>
                <button type="button" className="cc-link cc-link-btn" style={{ marginTop: 'var(--space-1)' }} onClick={() => onTab(r.tab)} aria-label={`View ${r.label}`}>View</button>
              </div>
              <div className={styles.statusCell}>
                {r.ok ? <StatusIcon kind="ok" label="Complete" /> : <StatusIcon kind="pending" label="Pending" />}
                <div>
                  <div className={styles.v}>Last updated {org.auditDate}</div>
                  <div className={styles.by}>By {r.by}</div>
                </div>
              </div>
            </div>
          ))}

          <div data-permi="manageOrgs" className={styles.kv} style={{ alignItems: 'center', borderBottom: 0 }}>
            <div className={styles.k}>{inactive ? 'Reactivate Organization' : 'Deactivate Organization'}</div>
            <div>
              {inactive
                ? <button type="button" className="cc-btn cc-btn--primary cc-btn--sm" onClick={() => setStatusDialog('reactivate')}>Reactivate</button>
                : <button type="button" className="cc-btn cc-btn--destructive cc-btn--sm" onClick={() => setStatusDialog('deactivate')}>Deactivate</button>}
            </div>
          </div>
        </div>

        <section aria-labelledby="op-setup-h" className={styles.summary}>
          <h3 id="op-setup-h" className={styles.summaryTitle}>Settings</h3>
          <div className={styles.summaryText}>
            {sum.done} on · {sum.off} off{sum.todo ? ` · ${sum.todo} incomplete` : ''}
          </div>
          <ul className={styles.summaryList}>
            {sum.rows.map((r) => (
              <li key={r.key} className={styles.summaryRow}>
                <span className={styles.summaryDot} aria-hidden="true" style={{ background: r.status === 'done' ? 'var(--success-500)' : r.status === 'off' ? 'var(--gray-300)' : 'var(--warning-500)' }} />
                <span style={{ flex: 1, minWidth: 0 }}>{r.label}</span>
                {r.key === 'batch' && r.status === 'done' ? (
                  <span title="Scheduled" style={{ display: 'inline-flex', color: 'var(--gray-600)' }}><Clock size={16} aria-hidden="true" /><span className="sr-only">Scheduled</span></span>
                ) : (
                  <span className={styles.summaryStatus} style={{ color: r.status === 'todo' ? 'var(--warning-700)' : 'var(--gray-600)' }}>{r.statusLabel}</span>
                )}
              </li>
            ))}
          </ul>
          <button type="button" className={`cc-link cc-link-btn ${styles.viewSettings}`} onClick={() => onTab('settings')}>
            View settings<ChevronRight size={16} aria-hidden="true" />
          </button>
        </section>
      </div>

      {statusDialog && (
        <Dialog
          title={statusDialog === 'deactivate' ? 'Deactivate organization' : 'Reactivate organization'}
          description={statusDialog === 'deactivate'
            ? 'Are you sure you want to deactivate this organization? All users will lose access immediately.'
            : 'Are you sure you want to reactivate this organization? All users will still be inactive. Please reactivate a user who can invite their team.'}
          onClose={() => { setStatusDialog(null); setReason(''); }}
          actions={
            <>
              <button type="button" className="cc-btn cc-btn--secondary" onClick={() => { setStatusDialog(null); setReason(''); }}>Cancel</button>
              <button
                type="button"
                className={`cc-btn ${statusDialog === 'deactivate' ? 'cc-btn--destructive' : 'cc-btn--primary'}`}
                aria-disabled={statusDialog === 'deactivate' && !reason}
                onClick={confirmStatus}
              >
                {statusDialog === 'deactivate' ? 'Deactivate organization' : 'Reactivate organization'}
              </button>
            </>
          }
        >
          <div className={styles.dlgOrg}>({org.num}) {org.name}</div>
          {statusDialog === 'deactivate' && (
            <fieldset className={styles.reasons}>
              <legend className={styles.reasonsLegend}>Reason</legend>
              {REASONS.map((r) => (
                <label key={r.value} className="cc-radio">
                  <input className="cc-radio__input" type="radio" name="op-de-reason" checked={reason === r.value} onChange={() => setReason(r.value)} />
                  {r.label}
                </label>
              ))}
            </fieldset>
          )}
          <p className={styles.dlgNote}>
            {statusDialog === 'deactivate'
              ? 'No data will be deleted. You can reactivate this organization at any time.'
              : 'Existing users will not regain access until they are reactivated.'}
          </p>
        </Dialog>
      )}
    </>
  );
}
