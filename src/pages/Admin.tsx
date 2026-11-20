/* Admin: settings that apply to every organization (Countries) and the Action log of settings changes. */

import { useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Save } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';
import { SegTabs } from '../components/SegTabs';
import { Dialog } from '../components/Dialog';
import { AdminCountries, type CountriesHandle } from './AdminCountries';
import { AdminActionLog } from './AdminActionLog';
import styles from './Admin.module.css';

type Tab = 'countries' | 'action-log';

export function Admin() {
  const [params, setParams] = useSearchParams();
  const tab: Tab = params.get('tab') === 'action-log' ? 'action-log' : 'countries';
  const countries = useRef<CountriesHandle>(null);
  const [leaveTo, setLeaveTo] = useState<Tab | null>(null);

  const go = (t: Tab) => setParams(t === 'countries' ? {} : { tab: t }, { replace: true });
  const onTab = (t: Tab) => {
    if (t === tab) return;
    if (tab === 'countries' && countries.current?.dirty()) { setLeaveTo(t); return; }
    go(t);
  };

  return (
    <>
      <PageHeader title="Admin" subtitle="Settings that apply to every organization, and a record of settings changes.">
        <div style={{ marginTop: 'var(--space-5)' }}>
          <SegTabs
            tabs={[{ key: 'countries', label: 'Countries' }, { key: 'action-log', label: 'Action log' }]}
            value={tab}
            onChange={onTab}
            label="Admin sections"
          />
        </div>
      </PageHeader>

      <div className={`cc-scr ${styles.body}`}>
        {tab === 'countries' ? <AdminCountries ref={countries} /> : <AdminActionLog />}
      </div>

      {leaveTo && (
        <Dialog
          role="alertdialog"
          title="Unsaved changes"
          onClose={() => setLeaveTo(null)}
          actions={
            <>
              <button type="button" className="cc-btn cc-btn--tertiary" onClick={() => setLeaveTo(null)}>Cancel</button>
              <button type="button" className="cc-btn cc-btn--secondary" onClick={() => { countries.current?.discard(); go(leaveTo); setLeaveTo(null); }}>Discard changes</button>
              <button type="button" className="cc-btn cc-btn--primary" onClick={() => { countries.current?.save(); go(leaveTo); setLeaveTo(null); }}>Save changes</button>
            </>
          }
        >
          <div className={styles.leave}>
            <span className={styles.leaveIcon} aria-hidden="true"><Save size={24} /></span>
            <p className={styles.leaveText}>Are you sure you want to leave this page? All changes will be lost.</p>
          </div>
        </Dialog>
      )}
    </>
  );
}
