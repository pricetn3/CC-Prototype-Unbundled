/* Org profile › Shipping: address cards per type (Credentials, Covers, Returns), archive and edit,
   and the view-only Archived shipping addresses dialog. */

import { useMemo, useState } from 'react';
import { Archive } from 'lucide-react';
import type { Org } from '../../data/orgs';
import { shipAddresses, type ShipAddress, type ShipTab } from '../../data/orgProfile';
import { Dialog } from '../../components/Dialog';
import { Drawer } from '../../components/Drawer';
import { useToast } from '../../components/Toast';
import s from './OrgTabs.module.css';

const TABS: { key: ShipTab; label: string }[] = [
  { key: 'credentials', label: 'Credentials' },
  { key: 'covers', label: 'Covers' },
  { key: 'returns', label: 'Returns' },
];
const SIDE: Record<ShipTab, [string, string]> = {
  credentials: ['Credential shipping', 'Where should credentials be sent?'],
  covers: ['Cover shipping', 'Where should diploma covers be sent?'],
  returns: ['Return address', 'Where should undeliverable credentials be returned?'],
};
const KIND: Record<ShipTab, string> = { credentials: 'credential', covers: 'covers', returns: 'return' };
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

type EdKey = 'contact' | 'email' | 'country' | 'line1' | 'line2' | 'city' | 'region' | 'postal' | 'name';
const ED_FIELDS: { k: EdKey; label: string; full: boolean; req: boolean }[] = [
  { k: 'contact', label: 'Attention', full: true, req: true },
  { k: 'email', label: 'Email', full: true, req: true },
  { k: 'country', label: 'Country', full: true, req: true },
  { k: 'line1', label: 'Address', full: true, req: true },
  { k: 'line2', label: 'Address 2', full: true, req: false },
  { k: 'city', label: 'City', full: true, req: true },
  { k: 'region', label: 'State/Province', full: false, req: true },
  { k: 'postal', label: 'Zip code', full: false, req: true },
  { k: 'name', label: 'Address nickname', full: true, req: true },
];

function edErrors(v: Record<EdKey, string>) {
  const e: Partial<Record<EdKey, string>> = {};
  ED_FIELDS.forEach((f) => { if (f.req && f.k !== 'email' && !v[f.k].trim()) e[f.k] = 'This field is required.'; });
  if (!EMAIL_RE.test(v.email.trim())) e.email = 'Enter a valid email address, like name@school.edu.';
  return e;
}

export function ShippingTab({ org }: { org: Org }) {
  const toast = useToast();
  const [tab, setTab] = useState<ShipTab>('credentials');
  // Archive / edit overrides on top of the seed, keyed "tab:idx".
  const [ov, setOv] = useState<Record<string, Partial<ShipAddress>>>({});
  const list = (t: ShipTab) => shipAddresses(org, t).map((a) => ({ ...a, ...ov[t + ':' + a.idx] }));
  const visible = useMemo(() => list(tab).filter((a) => !a.archived), [tab, ov, org]); // eslint-disable-line react-hooks/exhaustive-deps

  const [arcOpen, setArcOpen] = useState(false);
  const [arcTab, setArcTab] = useState<ShipTab>('credentials');
  const [archiving, setArchiving] = useState<ShipAddress | null>(null);
  const [editing, setEditing] = useState<{ a: ShipAddress; v: Record<EdKey, string>; tried: boolean } | null>(null);

  const patch = (idx: number, p: Partial<ShipAddress>) => setOv((o) => ({ ...o, [tab + ':' + idx]: { ...o[tab + ':' + idx], ...p } }));

  const onArchive = (a: ShipAddress, isDefault: boolean) => {
    if (isDefault) { toast('Default address', `Set another address as default before archiving ${a.name}.`); return; }
    setArchiving(a);
  };
  const confirmArchive = () => {
    if (!archiving) return;
    patch(archiving.idx, { archived: true });
    toast('Successfully archived address', `${archiving.name} has been archived.`);
    setArchiving(null);
  };
  const onEdit = (a: ShipAddress) => {
    const cp = a.cityLine.split(',').map((x) => x.trim());
    setEditing({ a, tried: false, v: { name: a.name, contact: a.contact, email: a.email, line1: a.line1, line2: a.line2, city: cp[0] ?? '', region: cp[1] ?? '', postal: cp[2] ?? '', country: cp[3] || 'United States' } });
  };
  const saveEdit = () => {
    if (!editing) return;
    const v = editing.v;
    const errs = edErrors(v);
    if (Object.keys(errs).length) {
      setEditing({ ...editing, tried: true });
      window.setTimeout(() => document.getElementById('in-ed-' + Object.keys(errs)[0])?.focus(), 30);
      return;
    }
    patch(editing.a.idx, {
      name: v.name.trim(), contact: v.contact.trim(), email: v.email.trim(), line1: v.line1.trim(), line2: v.line2.trim(),
      cityLine: [v.city, v.region, v.postal, v.country].map((x) => x.trim()).filter(Boolean).join(', '),
    });
    setEditing(null);
    toast('Successfully updated address', 'Your changes have been saved.');
  };
  const edErrs = editing?.tried ? edErrors(editing.v) : {};
  const arcList = arcOpen ? list(arcTab).filter((a) => a.archived) : [];

  return (
    <>
      <h2 className={s.h2xl}>Shipping addresses</h2>
      <div className={`cc-utabs ${s.utabs}`} role="tablist" aria-label="Address type">
        {TABS.map((t) => (
          <button key={t.key} type="button" role="tab" aria-selected={t.key === tab} className="cc-utabs__tab" onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      <div className={s.split} role="tabpanel">
        <div>
          <div className={s.sideTitle}>{SIDE[tab][0]}</div>
          <div className={s.sub}>{SIDE[tab][1]}</div>
          <div style={{ marginTop: 'var(--space-4)' }}>
            <button type="button" className="cc-btn cc-btn--secondary" onClick={() => { setArcTab(tab); setArcOpen(true); }}>View archived</button>
          </div>
        </div>
        <div className={s.cards}>
          {visible.map((a, i) => (
            <div key={a.idx} className={`${s.card} ${i === 0 ? s.cardDefault : ''}`}>
              <span className={s.cardHead}>
                <span className={s.cardName}>{a.name}</span>
                <span className={s.doc}>{a.docNo}</span>
                {i === 0 && <span className="cc-badge cc-badge--square cc-badge--success">Default</span>}
              </span>
              <span className={s.lineStrong}>{a.line2 ? `${a.line1}, ${a.line2}` : a.line1}</span>
              <span className={s.line}>{a.cityLine}</span>
              <span className={s.line}>{a.contact}, {a.email}</span>
              {a.phone && <span className={s.line}>{a.phone}</span>}
              {(a.days || a.hours) && <span className={s.line} style={{ marginTop: 'var(--space-2_5)' }}>Delivery {[a.days, a.hours].filter(Boolean).join(' ')}</span>}
              {a.instructions && <span className={s.line}>{a.instructions}</span>}
              <span className={s.cardActions}>
                <button type="button" className={`cc-link cc-link--muted cc-link-btn ${s.linkMuted}`} aria-label={`Archive ${a.name}`} onClick={() => onArchive(a, i === 0)}>Archive</button>
                <button type="button" className={`cc-link cc-link-btn ${s.linkStrong}`} aria-label={`Edit ${a.name}`} onClick={() => onEdit(a)}>Edit</button>
              </span>
            </div>
          ))}
        </div>
      </div>

      {arcOpen && (
        <Dialog
          title="Archived shipping addresses"
          description="View archived addresses."
          maxWidth={1120}
          onClose={() => setArcOpen(false)}
          actions={<button type="button" className="cc-btn cc-btn--secondary" onClick={() => setArcOpen(false)}>Close</button>}
        >
          <div className={`cc-utabs ${s.utabs}`} role="tablist" aria-label="Archived address type">
            {TABS.map((t) => (
              <button key={t.key} type="button" role="tab" aria-selected={t.key === arcTab} className="cc-utabs__tab" onClick={() => setArcTab(t.key)}>{t.label}</button>
            ))}
          </div>
          <div className={s.arcBody} role="tabpanel">
            {arcList.length ? (
              <div className={s.cards} style={{ paddingBottom: 'var(--space-5)' }}>
                {arcList.map((a) => (
                  <div key={a.idx} className={s.card}>
                    <span className={s.cardName}>{a.name}</span>
                    <span className={s.lineStrong}>{a.line1}</span>
                    {a.line2 && <span className={s.line}>{a.line2}</span>}
                    <span className={s.line}>{a.cityLine}</span>
                    <span className={s.line}>{a.contact}</span>
                    <span className={s.line}>{a.email}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className={s.empty}>
                <span className={s.emptyIcon} aria-hidden="true"><Archive size={24} /></span>
                <div className={s.emptyTitle}>No archived addresses</div>
                <div className={s.sub} style={{ maxWidth: 380 }}>Addresses archived on this tab are kept here for reference.</div>
              </div>
            )}
          </div>
        </Dialog>
      )}

      {archiving && (
        <Dialog
          role="alertdialog"
          title="Archive shipping address"
          description={`Are you sure you want to archive this ${KIND[tab]} shipping address and all related information?`}
          maxWidth={480}
          onClose={() => setArchiving(null)}
          actions={
            <>
              <button type="button" className="cc-btn cc-btn--secondary" onClick={() => setArchiving(null)}>Cancel</button>
              <button type="button" className="cc-btn cc-btn--destructive" onClick={confirmArchive}>Archive address</button>
            </>
          }
        >
          <div className={s.dlgBox}>
            <span style={{ fontWeight: 'var(--fw-semibold)', color: 'var(--gray-900)' }}>{archiving.name}</span>
            <span>{archiving.line2 ? `${archiving.line1}, ${archiving.line2}` : archiving.line1}</span>
            <span>{archiving.cityLine}</span>
            <span>{archiving.contact}</span>
            <span>{archiving.email}</span>
          </div>
          <p className={s.dlgNote}>No data will be deleted. You can unarchive this address at any time.</p>
        </Dialog>
      )}

      {editing && (
        <Drawer
          title={`Edit ${KIND[tab]} shipping address`}
          subtitle="Edit this shipping address"
          onClose={() => setEditing(null)}
          footer={
            <>
              <button type="button" className="cc-btn cc-btn--secondary" onClick={() => setEditing(null)}>Cancel</button>
              <button type="button" className="cc-btn cc-btn--primary" onClick={saveEdit}>Save changes</button>
            </>
          }
        >
          <div className={s.formGrid}>
            {ED_FIELDS.map((f) => {
              const id = 'in-ed-' + f.k;
              const err = edErrs[f.k];
              return (
                <div key={f.k} className={f.full ? s.full : undefined}>
                  <label htmlFor={id} className={s.label}>{f.label}{f.req && <> <span aria-hidden="true" className={s.req}>*</span></>}</label>
                  <input
                    id={id} type="text" className="cc-input" style={{ width: '100%' }} value={editing.v[f.k]}
                    onChange={(e) => setEditing({ ...editing, v: { ...editing.v, [f.k]: e.target.value } })}
                    aria-required={f.req} aria-invalid={err ? true : false} aria-describedby={err ? id + '-err' : undefined}
                  />
                  {err && <p id={id + '-err'} className={s.err}>{err}</p>}
                </div>
              );
            })}
          </div>
        </Drawer>
      )}
    </>
  );
}
