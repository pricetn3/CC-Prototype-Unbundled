/* Orders: Active / Cancelled tabs, search, filter bar, date range and the orders table. A row opens the
   order panel (Details, Signatures, Files). */

import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CalendarCheck, CheckCircle2, ChevronRight, Clock, ExternalLink, FileSpreadsheet, FileText, ListFilter, Plus, SearchX, Truck,
} from 'lucide-react';
import { useStore } from '../data/store';
import { ORDERS, ORDERS_TODAY, ORDER_STATUS, ORDER_STATUS_KEYS, SERVICE_BY_STATUS, shipAddresses, type Order } from '../data/orders';
import { PageHeader } from '../components/PageHeader';
import { SegTabs } from '../components/SegTabs';
import { SearchField } from '../components/SearchField';
import { CCTable } from '../components/CCTable';
import { Drawer } from '../components/Drawer';
import { OrdersMenu } from '../components/OrdersMenu';
import { useToast } from '../components/Toast';
import styles from './Orders.module.css';

type Tab = 'orders' | 'cancelled';
type FacetKey = 'org' | 'dates' | 'by' | 'so' | 'status';
type Facets = Partial<Record<FacetKey, string>>;

const DAY = 86400000;
const parseDay = (s: string) => Date.parse(s) || 0;
const today0 = ORDERS_TODAY.getTime();
const DATE_DEFS = [
  { value: 'today', label: 'Today', test: (t: number) => t >= today0 },
  { value: 'yesterday', label: 'Yesterday', test: (t: number) => t >= today0 - DAY && t < today0 },
  { value: 'week', label: 'This week', test: (t: number) => t >= today0 - ORDERS_TODAY.getDay() * DAY },
  { value: 'month', label: 'This month', test: (t: number) => t >= new Date(ORDERS_TODAY.getFullYear(), ORDERS_TODAY.getMonth(), 1).getTime() },
];
const RANGES = [{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }];

const uniq = (a: string[]) => Array.from(new Set(a.filter(Boolean))).sort();

function badgeClass(tone: 'warning' | 'success' | 'error') {
  return `cc-badge cc-badge--${tone}`;
}

function longDate(d: Date) {
  const n = d.getDate(); const s = ['th', 'st', 'nd', 'rd']; const v = n % 100;
  const ord = n + (s[(v - 20) % 10] || s[v] || s[0]);
  return `${d.toLocaleDateString('en-US', { weekday: 'long' })}, ${d.toLocaleDateString('en-US', { month: 'short' })} ${ord}, ${d.getFullYear()}`;
}
const addDays = (n: number) => new Date(ORDERS_TODAY.getTime() + n * DAY);

export function Orders() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>('orders');
  const [q, setQ] = useState('');
  const [range, setRange] = useState('30');
  const [barOpen, setBarOpen] = useState(false);
  const [draft, setDraft] = useState<Facets>({});
  const [applied, setApplied] = useState<Facets>({});
  const openId = params.get('order');
  const setOpenId = (id: string | null) => setParams(id ? { order: id } : {}, { replace: true });

  const isCancelled = tab === 'cancelled';
  const facetDefs = useMemo(() => {
    const defs: { key: FacetKey; label: string; opts: { value: string; label: string }[] }[] = [
      { key: 'org', label: 'Organizations', opts: uniq(ORDERS.map((o) => o.org)).map((v) => ({ value: v, label: v })) },
      { key: 'dates', label: 'Dates', opts: DATE_DEFS.map(({ value, label }) => ({ value, label })) },
      { key: 'by', label: 'Ordered By', opts: uniq(ORDERS.map((o) => o.placedBy)).map((v) => ({ value: v, label: v })) },
      { key: 'so', label: 'SO Number', opts: uniq(ORDERS.map((o) => o.so)).map((v) => ({ value: v, label: v })) },
    ];
    if (!isCancelled) defs.push({ key: 'status', label: 'Status', opts: ORDER_STATUS_KEYS.filter((k) => k !== 'cancelled').map((k) => ({ value: k, label: ORDER_STATUS[k].label })) });
    return defs;
  }, [isCancelled]);

  const appliedN = facetDefs.filter((f) => applied[f.key]).length;
  const hasDraft = facetDefs.some((f) => draft[f.key]);
  const cutoff = today0 - Number(range) * DAY;
  const dateTest = DATE_DEFS.find((d) => d.value === applied.dates)?.test;
  const qn = q.trim().toLowerCase();

  const rows = ORDERS.filter((o) =>
    (isCancelled ? o.status === 'cancelled' : o.status !== 'cancelled' && (!applied.status || o.status === applied.status)) &&
    (!applied.org || o.org === applied.org) && (!applied.by || o.placedBy === applied.by) && (!applied.so || o.so === applied.so) &&
    (!dateTest || dateTest(parseDay(o.date))) &&
    parseDay(o.date) >= cutoff &&
    (!qn || [o.id, o.org, o.group, o.so, o.interim, o.placedBy].some((x) => x.toLowerCase().includes(qn))),
  );

  const order = ORDERS.find((o) => o.id === openId) ?? null;

  return (
    <>
      <PageHeader
        title="Orders"
        subtitle="View and manage all orders."
        actions={<button data-permi="manageOrders" type="button" className="cc-btn cc-btn--primary" onClick={() => navigate('/orders/new')}><Plus size={16} aria-hidden="true" />New order</button>}
      />

      <div className={`cc-scr ${styles.wrap}`}>
        <div className={styles.card}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarLeft}>
              <SegTabs
                inset
                label="Order status"
                tabs={[{ key: 'orders', label: 'Active' }, { key: 'cancelled', label: 'Cancelled' }]}
                value={tab}
                onChange={(k) => { setTab(k); if (k === 'cancelled') { setDraft((d) => ({ ...d, status: undefined })); setApplied((a) => ({ ...a, status: undefined })); } }}
              />
              <span className={styles.count} role="status" aria-live="polite">{rows.length} {rows.length === 1 ? 'result' : 'results'}</span>
            </div>
            <div className={styles.tools}>
              <SearchField value={q} onChange={setQ} width={300} placeholder="Search" aria-label="Search orders" clearable />
              <button
                type="button"
                className={`cc-btn cc-btn--secondary ${barOpen ? styles.filterOn : ''}`}
                aria-expanded={barOpen}
                aria-controls="orders-fbar"
                onClick={() => setBarOpen((o) => !o)}
              >
                <ListFilter size={16} aria-hidden="true" />Filter
                {appliedN > 0 && <span className={styles.filterCount} aria-label={`${appliedN} applied`}>{appliedN}</span>}
              </button>
              <OrdersMenu id="orders-range" buttonLabel={RANGES.find((r) => r.value === range)!.label} options={RANGES} value={range} onChange={setRange} align="end" menuWidth={200} />
            </div>
          </div>

          <div id="orders-fbar" className={`cc-filter-bar ${styles.filterBar}`} hidden={!barOpen}>
            <div className="cc-filter-bar__filters" style={{ alignItems: 'center' }}>
              {facetDefs.map((f) => {
                const cur = draft[f.key];
                const curOpt = f.opts.find((o) => o.value === cur);
                return (
                  <OrdersMenu
                    key={f.key}
                    id={`of-${f.key}`}
                    buttonClassName={`cc-btn cc-btn--secondary cc-btn--sm ${curOpt ? styles.facetOn : ''}`}
                    buttonLabel={curOpt ? `${f.label}: ${curOpt.label}` : f.label}
                    options={[{ value: '', label: 'All' }, ...f.opts]}
                    value={cur ?? ''}
                    onChange={(v) => setDraft((d) => ({ ...d, [f.key]: v || undefined }))}
                    menuWidth={f.key === 'org' ? 280 : 220}
                  />
                );
              })}
            </div>
            <div className="cc-filter-bar__actions">
              <button type="button" className="cc-link cc-link-btn" disabled={!hasDraft && !appliedN} onClick={() => { setDraft({}); setApplied({}); }}>Clear all</button>
              <button type="button" className="cc-btn cc-btn--secondary cc-btn--sm" onClick={() => setApplied({ ...draft })}>Apply filters</button>
            </div>
          </div>

          <CCTable label="Orders" minWidth="1000px" empty={rows.length === 0} emptyIcon={SearchX} emptyTitle="No orders match this filter">
            <thead>
              <tr>
                <th className={styles.first} style={{ width: 190 }}>Order Placed</th>
                <th style={{ width: 200 }}>Organization</th>
                <th style={{ width: 140 }}>SO Number</th>
                <th style={{ width: 120 }}>Ship Date</th>
                <th style={{ width: 160 }}>Digital Release Date</th>
                <th style={{ width: 110 }}>Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((o) => {
                const m = ORDER_STATUS[o.status];
                return (
                  <tr key={o.id} className={`${styles.row} ${openId === o.id ? styles.rowOpen : ''}`} onClick={() => setOpenId(o.id)}>
                    <td className={styles.first}>
                      <button type="button" className={`${styles.rowBtn} ${styles.strong}`} onClick={(e) => { e.stopPropagation(); setOpenId(o.id); }} aria-label={`Order ${o.so}, placed ${o.date}`}>{o.date}</button>
                      <span className={`${styles.muted} ${styles.trunc}`} title={`by ${o.placedBy}`}>by {o.placedBy}</span>
                    </td>
                    <td style={{ maxWidth: 200 }}><span className={styles.trunc} title={o.org}>{o.org}</span></td>
                    <td className={styles.nums}>{o.so}</td>
                    <td className={styles.nowrap}>{o.shipDate}</td>
                    <td className={styles.nowrap}>{o.digitalRelease}</td>
                    <td><span className={badgeClass(m.tone)}>{m.label}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </CCTable>
        </div>
      </div>

      {order && (
        <OrderPanel
          key={order.id}
          order={order}
          onClose={() => setOpenId(null)}
          onViewCredentials={() => {
            const kind = /digital|micro/i.test(order.type) ? 'digital' : 'paper';
            navigate(`/orders/credentials?tab=${kind}&so=${encodeURIComponent(order.so)}&org=${encodeURIComponent(order.org)}&order=${encodeURIComponent(order.id)}`);
          }}
          onCancel={() => { setOpenId(null); toast('Order cancelled', `${order.so} was cancelled.`); }}
          onTrack={() => toast('Track order', 'Opening carrier tracking is not available in this prototype.')}
        />
      )}
    </>
  );
}

type PTab = 'details' | 'signatures' | 'files';

function OrderPanel({ order, onClose, onViewCredentials, onCancel, onTrack }: {
  order: Order; onClose: () => void; onViewCredentials: () => void; onCancel: () => void; onTrack: () => void;
}) {
  const { orgs } = useStore();
  const [ptab, setPtab] = useState<PTab>('details');
  const m = ORDER_STATUS[order.status];
  const org = orgs.find((o) => o.name === order.org);
  const addr = shipAddresses(org?.email).filter((a) => !a.archived)[0];
  const orderer = 'Michael Brown';
  const initials = orderer.split(/\s+/).map((p) => p[0]).slice(0, 2).join('').toUpperCase();
  const files = [
    { name: 'HarvardSampleSpreadsheetP4-2026.xlsx', size: '200 KB of 200 KB' },
    { name: 'Diploma-Roster-Final.xlsx', size: '184 KB of 184 KB' },
    { name: 'Address-Corrections.xlsx', size: '96 KB of 96 KB' },
    { name: 'Signature-Approvals.pdf', size: '312 KB of 312 KB' },
  ];
  const tabs: [PTab, string][] = [['details', 'Details'], ['signatures', 'Signatures'], ['files', 'Files']];

  return (
    <Drawer
      width={520}
      title={`Order ${order.so}`}
      subtitle={<>
        Interim Number: {order.interim}
        <br />
        <button type="button" className={`cc-link cc-link-btn ${styles.panelLink}`} onClick={onViewCredentials}>View order credentials<ChevronRight size={16} aria-hidden="true" /></button>
      </>}
      onClose={onClose}
      footer={
        <div className={styles.footer}>
          <button data-permi="manageOrders" type="button" className="cc-btn cc-btn--destructive-secondary" onClick={onCancel}>Cancel order</button>
          <button type="button" className="cc-btn cc-btn--primary" onClick={onTrack}><ExternalLink size={16} aria-hidden="true" />Track order</button>
        </div>
      }
    >
      <div className={styles.panelTabs} role="tablist" aria-label="Order sections">
        {tabs.map(([k, l]) => (
          <button key={k} type="button" role="tab" id={`od-tab-${k}`} aria-selected={ptab === k} aria-controls="od-tabpanel" className={styles.panelTab} onClick={() => setPtab(k)}>{l}</button>
        ))}
      </div>
      <div id="od-tabpanel" role="tabpanel" aria-labelledby={`od-tab-${ptab}`}>
        {ptab === 'details' && (
          <>
            <div className={styles.statusRow}>
              <h3 className={styles.h3}>Status</h3>
              <span className={badgeClass(m.tone)}>{m.label}</span>
            </div>
            <ul className={styles.timeline}>
              <li className={styles.tl}><Clock size={18} aria-hidden="true" />Ordered on {order.date}</li>
              <li className={styles.tl}><Truck size={18} aria-hidden="true" />Shipping by {longDate(addDays(5))}</li>
              <li className={styles.tl}><CalendarCheck size={18} aria-hidden="true" />Digital release on {longDate(addDays(7))}</li>
            </ul>
            <dl className={styles.grid2}>
              <div><dt className={styles.dt}>Organization</dt><dd className={styles.dd}>{order.org}</dd></div>
              <div><dt className={styles.dt}>Service type</dt><dd className={styles.dd}>{SERVICE_BY_STATUS[order.status]}</dd></div>
            </dl>
            <div className={styles.section}>
              <div className={styles.dt}>Tracking</div>
              <a className="cc-link" href="https://www.ups.com/track" target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginTop: 'var(--space-1)' }}>
                {'1Z12345E029198' + order.id.replace(/\D/g, '').slice(-4)}
              </a>
            </div>
            {addr && (
              <div className={styles.section}>
                <div className={styles.dt}>Shipping</div>
                <div className={styles.addr}>
                  <span className={styles.dt}>{addr.name}</span>
                  <span style={{ color: 'var(--gray-700)' }}>{addr.line1}</span>
                  {addr.line2 && <span>{addr.line2}</span>}
                  <span>{addr.cityLine}</span>
                  <span>{addr.contact}</span>
                  <span style={{ color: 'var(--gray-500)' }}>{addr.email}</span>
                </div>
              </div>
            )}
            <div className={styles.section}>
              <div className={styles.dt}>Orderer</div>
              <div className={styles.orderer}>
                <span className={styles.avatar} aria-hidden="true">{initials}</span>
                <div>
                  <div className={styles.name}>{orderer}</div>
                  <div className={styles.dd} style={{ marginTop: 0, color: 'var(--gray-500)' }}>MichaelB@organization.com</div>
                </div>
              </div>
            </div>
          </>
        )}

        {ptab === 'signatures' && (
          <>
            <div className={styles.headRow}>
              <h3 className={styles.h3}>Using pending signatures</h3>
              <span className={styles.pill}>2 selected</span>
            </div>
            <ul className={styles.list}>
              {['Dr. Dan Johnson', 'Dr. Eleanor Vance'].map((n, i) => (
                <li key={n}>
                  <div className={styles.name}>{n}</div>
                  <div className={styles.small}>Confirmed by {orderer} on {order.date}, {i ? '9:44' : '9:42'} AM</div>
                </li>
              ))}
            </ul>
            <div className={styles.divided}>
              <div className={styles.dt}>Signature inaccuracy note</div>
              <div className={styles.dd} style={{ color: 'var(--gray-700)' }}>There has been a school name change for the School of Engineering.</div>
              <div className={styles.small} style={{ marginTop: 'var(--space-1_5)' }}>Confirmed by {orderer} on {order.date}</div>
            </div>
            <div className={styles.divided}>
              <div className={styles.dt} style={{ marginBottom: 'var(--space-2_5)' }}>Signatures at time of ordering</div>
              <div className={styles.headRow}>
                <span className={styles.fileIcon} aria-hidden="true"><FileText size={18} /></span>
                <span className={styles.small} style={{ marginTop: 0 }}>{order.date}, 9:45 AM</span>
              </div>
            </div>
          </>
        )}

        {ptab === 'files' && (
          <>
            <div className={styles.headRow}>
              <h3 className={styles.h3}>Spreadsheet</h3>
              <span className={styles.pill}>4 files</span>
            </div>
            <ul className={styles.list} style={{ gap: 'var(--space-3)' }}>
              {files.map((f) => (
                <li key={f.name} className={styles.file}>
                  <span className={styles.fileIcon} aria-hidden="true"><FileSpreadsheet size={18} /></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={styles.name}>{f.name}</div>
                    <div className={styles.fileMeta}>
                      <span>{f.size}</span>
                      <span className={styles.sep} aria-hidden="true" />
                      <span className={styles.complete}><CheckCircle2 size={15} aria-hidden="true" />Complete</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </Drawer>
  );
}
