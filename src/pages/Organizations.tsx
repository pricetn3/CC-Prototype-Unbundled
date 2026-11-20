/* Organizations: every org on the platform, with search, a filter bar and setup status. */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Building2, ChevronRight, ListFilter, Plus } from 'lucide-react';
import { useStore } from '../data/store';
import { settingsSummary, type Org } from '../data/orgs';
import { PageHeader } from '../components/PageHeader';
import { CCTable } from '../components/CCTable';
import { SearchField } from '../components/SearchField';
import { FilterDropdown } from '../components/FilterDropdown';
import { StatusIcon } from '../components/StatusIcon';
import styles from './Organizations.module.css';

type FacetKey = 'org' | 'shipping' | 'billing' | 'punctuation';
type Filters = Record<FacetKey, string[]>;
const EMPTY: Filters = { org: [], shipping: [], billing: [], punctuation: [] };
const CI_OPTS = [{ value: 'complete', label: 'Complete' }, { value: 'incomplete', label: 'Incomplete' }];
const SETUP_COLS: { key: 'shipping' | 'billing' | 'punctuation'; label: string; title: string }[] = [
  { key: 'shipping', label: 'Ship', title: 'Shipping' },
  { key: 'billing', label: 'Bill', title: 'Billing' },
  { key: 'punctuation', label: 'Punct', title: 'Punctuation' },
];

export function Organizations() {
  const navigate = useNavigate();
  const { orgs } = useStore();
  const [search, setSearch] = useState('');
  const [barOpen, setBarOpen] = useState(false);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [draft, setDraft] = useState<Filters | null>(null);
  const [showInactive, setShowInactive] = useState(false);

  const d = draft ?? applied;
  const setFacet = (k: FacetKey, v: string[]) => setDraft({ ...d, [k]: v });
  const draftN = d.org.length + d.shipping.length + d.billing.length + d.punctuation.length;
  const appliedN = applied.org.length + applied.shipping.length + applied.billing.length + applied.punctuation.length + (showInactive ? 1 : 0);

  const orgOptions = useMemo(
    () => orgs.slice().sort((a, b) => a.name.localeCompare(b.name)).map((o) => ({ value: o.id, label: o.name, meta: String(o.num) })),
    [orgs],
  );

  const q = search.trim().toLowerCase();
  const ciMatch = (sel: string[], ok: boolean) => !sel.length || sel.includes(ok ? 'complete' : 'incomplete');
  const visible = orgs.filter((o) =>
    (showInactive || o.status !== 'inactive') &&
    (!applied.org.length || applied.org.includes(o.id)) &&
    ciMatch(applied.shipping, o.setup.shipping) &&
    ciMatch(applied.billing, o.setup.billing) &&
    ciMatch(applied.punctuation, o.setup.punctuation) &&
    (!q || o.name.toLowerCase().includes(q) || String(o.num).includes(q)),
  );

  const clearAll = () => { setApplied(EMPTY); setDraft(null); setShowInactive(false); };
  const apply = () => { setApplied(d); setDraft(null); };

  return (
    <>
      <PageHeader
        title="Organizations"
        subtitle="All organizations added to the platform."
        actions={<button type="button" className="cc-btn cc-btn--primary" onClick={() => navigate('/organizations/new')}><Plus size={16} aria-hidden="true" />Add organization</button>}
      />

      <div className={`cc-scr ${styles.wrap}`}>
        <div className={styles.card}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarTitle}>
              <h2 className={styles.cardTitle}>Organization overview</h2>
              <span className="cc-badge cc-badge--brand" aria-live="polite">{visible.length} {visible.length === 1 ? 'organization' : 'organizations'}</span>
            </div>
            <div className={styles.tools}>
              <SearchField value={search} onChange={setSearch} width={300} placeholder="Search by name or ID" aria-label="Search organizations by name or ID" clearable />
              <button type="button" className="cc-btn cc-btn--secondary cc-filter-toggle" aria-expanded={barOpen} aria-controls="orgs-fbar" onClick={() => { setBarOpen((o) => !o); setDraft(null); }}>
                <ListFilter size={18} aria-hidden="true" />Filter
                {appliedN > 0 && !barOpen && <span className={styles.filterCount}>{appliedN}</span>}
              </button>
            </div>
          </div>

          <div id="orgs-fbar" className={`cc-filter-bar ${styles.filterBar}`} hidden={!barOpen}>
            <div className="cc-filter-bar__filters" style={{ alignItems: 'center' }}>
              <FilterDropdown id="of-org" label="Organization" options={orgOptions} selected={d.org} onChange={(v) => setFacet('org', v)} width={440} />
              <FilterDropdown id="of-shipping" label="Shipping" options={CI_OPTS} selected={d.shipping} onChange={(v) => setFacet('shipping', v)} />
              <FilterDropdown id="of-billing" label="Billing" options={CI_OPTS} selected={d.billing} onChange={(v) => setFacet('billing', v)} />
              <FilterDropdown id="of-punctuation" label="Punctuation" options={CI_OPTS} selected={d.punctuation} onChange={(v) => setFacet('punctuation', v)} />
              <label className={`cc-checkbox ${styles.inactive}`}>
                <input className="cc-checkbox__input" type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />
                Show Inactive
              </label>
            </div>
            <div className="cc-filter-bar__actions" hidden={!(draftN || appliedN)}>
              <button type="button" className="cc-link cc-link-btn" onClick={clearAll}>Clear all</button>
              <button type="button" className="cc-btn cc-btn--secondary cc-btn--sm" onClick={apply}>Apply filters</button>
            </div>
          </div>

          <CCTable
            label="Organizations"
            minWidth="920px"
            empty={visible.length === 0}
            emptyIcon={Building2}
            emptyTitle="No organizations found"
            emptyText="Your search did not match any organizations. Try again or add a new one."
          >
            <thead>
              <tr>
                <th style={{ width: 60, paddingLeft: 'var(--space-5)' }}>ID</th>
                <th>Organization</th>
                {SETUP_COLS.map((c) => <th key={c.key} title={c.title} style={{ textAlign: 'center', paddingInline: 'var(--space-1_5)' }}>{c.label}</th>)}
                <th style={{ width: 120 }} title="Organization settings">Settings</th>
                <th>Status</th>
                <th style={{ width: 44 }}><span className="sr-only">Open</span></th>
              </tr>
            </thead>
            <tbody>
              {visible.map((o) => <OrgRow key={o.id} org={o} onOpen={() => navigate(`/organizations/${o.num}`)} />)}
            </tbody>
          </CCTable>
        </div>
      </div>
    </>
  );
}

function OrgRow({ org: o, onOpen }: { org: Org; onOpen: () => void }) {
  const sum = settingsSummary(o);
  return (
    <tr className={styles.row} onClick={onOpen}>
      <td className={styles.idCell}>{o.num}</td>
      <td>
        {/* The name is the row's link, so the row works from the keyboard. */}
        <a href={`/organizations/${o.num}`} className={styles.nameLink} onClick={(e) => { e.preventDefault(); e.stopPropagation(); onOpen(); }}>{o.name}</a>
      </td>
      {SETUP_COLS.map((c) => (
        <td key={c.key} style={{ textAlign: 'center', paddingInline: 'var(--space-1_5)' }}>
          {o.setup[c.key] ? <StatusIcon kind="ok" label={`${c.title} complete`} /> : <StatusIcon kind="pending" label={`${c.title} pending`} />}
        </td>
      ))}
      <td>
        <span className={styles.settings} style={{ color: sum.todo ? 'var(--warning-700)' : 'var(--gray-700)' }}>
          {sum.todo > 0 && <AlertCircle size={16} aria-hidden="true" />}
          {sum.todo ? `${sum.todo} incomplete` : `${sum.done} on`}
        </span>
      </td>
      <td>
        {o.status === 'inactive'
          ? <span className="cc-badge cc-badge--error"><span className="cc-badge__dot" aria-hidden="true" style={{ background: 'var(--error-500)' }} />Inactive</span>
          : <span className={styles.statusText}>{o.status === 'hold' ? 'On hold' : 'Active'}</span>}
      </td>
      <td style={{ textAlign: 'center' }}><ChevronRight size={18} color="var(--gray-500)" aria-hidden="true" /></td>
    </tr>
  );
}
