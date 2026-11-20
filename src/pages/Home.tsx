/* Home: welcome header, three metric cards, recent organizations and quick actions. */

import { useNavigate } from 'react-router-dom';
import { ArrowRight, BarChart3, Clock, Feather, Lock, Package, Plus, Search, User, type LucideIcon } from 'lucide-react';
import { CURRENT_USER, HOME_COUNTS, useStore } from '../data/store';
import { PageHeader } from '../components/PageHeader';
import { StatusIcon } from '../components/StatusIcon';
import styles from './Home.module.css';

/** "20 November, 2026" */
const todayText = (d = new Date()) => `${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'long' })}, ${d.getFullYear()}`;

export function Home() {
  const navigate = useNavigate();
  const { orgs } = useStore();

  let totalUsers = 0;
  let pendingUsers = 0;
  orgs.forEach((o) => o.usersList.forEach((u) => { totalUsers++; if (u.role === 'Invited') pendingUsers++; }));

  const metrics: { icon: LucideIcon; label: string; value: number; sub: string; badge?: string; to: string }[] = [
    { icon: Package, label: 'Orders', value: HOME_COUNTS.orders, sub: 'Last 30 days', to: '/orders' },
    { icon: Feather, label: 'Pending signatures', value: HOME_COUNTS.pendingSignatures, sub: `${HOME_COUNTS.signaturesUsed} used in orders`, to: '/signatures' },
    { icon: User, label: 'Users', value: totalUsers, sub: 'Across all organizations', badge: pendingUsers ? `${pendingUsers} pending` : undefined, to: '/users' },
  ];

  const quickActions: { icon: LucideIcon; title: string; desc: string; to: string }[] = [
    { icon: Search, title: 'Search credentials', desc: 'Find credentials from past orders', to: '/orders/credentials' },
    { icon: BarChart3, title: 'View reports', desc: 'Access detailed insights and analytics', to: '/reports' },
    { icon: Clock, title: 'View student reorders', desc: 'Check reorders expiring within 60 days', to: '/orders/reorders' },
    { icon: Lock, title: 'Review holds', desc: 'Release or delete records on hold', to: '/orders/holds' },
  ];

  return (
    <>
      <PageHeader
        divider
        lead={<span className={styles.avatar} aria-hidden="true">{CURRENT_USER.initials}</span>}
        title={`Welcome, ${CURRENT_USER.first}`}
        subtitle={<span style={{ color: 'var(--gray-500)' }}>{todayText()}</span>}
        actions={
          <>
            <button type="button" className="cc-btn cc-btn--secondary" onClick={() => navigate('/organizations/new')}>Add organization</button>
            <button type="button" className="cc-btn cc-btn--secondary" onClick={() => navigate('/users/invite')}>Invite user</button>
            <button type="button" className="cc-btn cc-btn--primary" onClick={() => navigate('/orders/new')}><Plus size={16} aria-hidden="true" />New order</button>
          </>
        }
      />

      <div className={`cc-scr ${styles.metrics}`}>
        {metrics.map((m) => (
          <button key={m.label} type="button" className={styles.metric} onClick={() => navigate(m.to)}>
            <div className={styles.metricBody}>
              <span className={styles.metricIcon} aria-hidden="true"><m.icon size={20} /></span>
              <div className={styles.metricText}>
                <div className={styles.metricLabel}>{m.label}</div>
                <div className={styles.metricValueRow}>
                  <span className={styles.metricValue}>{m.value}</span>
                  {m.badge && <span className="cc-badge cc-badge--square cc-badge--warning">{m.badge}</span>}
                </div>
              </div>
            </div>
            <div className={styles.metricFoot}>
              <span className={styles.metricSub}>{m.sub}</span>
              <span className={styles.metricView}>View<span className={styles.metricArrow}><ArrowRight size={16} aria-hidden="true" /></span></span>
            </div>
          </button>
        ))}
      </div>

      <div className={`cc-scr ${styles.split}`}>
        <section className={styles.card} aria-labelledby="home-recent">
          <div className={styles.cardHead}>
            <h2 id="home-recent" className={styles.cardTitle}>Recent organizations</h2>
            <button type="button" className="cc-btn cc-btn--secondary cc-btn--sm" onClick={() => navigate('/organizations')}>
              View all {orgs.length}<ArrowRight size={16} aria-hidden="true" />
            </button>
          </div>
          <div className={styles.list}>
            {orgs.slice(0, 7).map((o) => (
              <button key={o.id} type="button" className={styles.orgRow} onClick={() => navigate(`/organizations/${o.num}`)}>
                <span className={styles.orgNum}>{o.num}</span>
                <span className={styles.orgName}>{o.name}</span>
                {o.status === 'active' && <StatusIcon kind="ok" label="Active" />}
                {o.status === 'hold' && <StatusIcon kind="pending" label="On hold" />}
                {o.status === 'inactive' && <StatusIcon kind="error" label="Inactive" />}
              </button>
            ))}
          </div>
        </section>

        <section className={styles.card} aria-labelledby="home-quick">
          <h2 id="home-quick" className={styles.cardTitle} style={{ marginBottom: 'var(--space-4)' }}>Quick actions</h2>
          <div className={styles.quick}>
            {quickActions.map((q) => (
              <button key={q.title} type="button" className={styles.quickItem} onClick={() => navigate(q.to)}>
                <span className={styles.quickIcon} aria-hidden="true"><q.icon size={16} strokeWidth={1.5} /></span>
                <div>
                  <div className={styles.quickTitle}>{q.title}</div>
                  <div className={styles.quickDesc}>{q.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
