/* Org profile › Billing: the invoice mailing address card with its approval status. */

import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Org } from '../../data/orgs';
import { billingFor, billNeedsApproval } from '../../data/orgProfile';
import { useToast } from '../../components/Toast';
import s from './OrgTabs.module.css';

export function BillingTab({ org }: { org: Org }) {
  const toast = useToast();
  const [approved, setApproved] = useState(() => !billNeedsApproval(org));
  const b = billingFor(org);

  const approve = () => {
    setApproved(true);
    toast('Billing approved', `Billing information for ${org.name} was approved.`);
  };

  return (
    <>
      <h2 className={`${s.h2xl} ${s.head}`} style={{ paddingBottom: 'var(--space-5)' }}>Billing Address</h2>
      <div className={s.split}>
        <div>
          <div className={s.sideTitle}>Invoice mailing address</div>
          <div className={s.sub}>Where should invoices be sent?</div>
        </div>
        <div className={s.billCol}>
          <div className={`${s.card} ${s.cardDefault}`}>
            <span className={s.cardHead}>
              <span className={s.cardName}>{b.line1}</span>
              <span className={`cc-badge ${approved ? 'cc-badge--success' : 'cc-badge--warning'}`}>{approved ? 'Approved' : 'Pending'}</span>
            </span>
            {b.line2 && <span className={s.lineStrong}>{b.line2}</span>}
            <span className={s.line}>{[b.city, b.region, b.postal, b.country].join(', ')}</span>
            <span className={s.line}>{b.contact}</span>
            <span className={s.line}>{b.email}</span>
            <span className={s.po}>
              <span className={s.poBox} role="img" aria-label="Checked"><Check size={13} aria-hidden="true" /></span>
              <span style={{ display: 'flex', flexDirection: 'column' }}>
                <span className={s.lineStrong}>Blanket/Annual P.O.</span>
                <span className={s.mono}>{b.po}</span>
              </span>
            </span>
          </div>
          {!approved && <button type="button" className="cc-btn cc-btn--primary" style={{ width: '100%' }} onClick={approve}>Approve billing information</button>}
        </div>
      </div>
    </>
  );
}
