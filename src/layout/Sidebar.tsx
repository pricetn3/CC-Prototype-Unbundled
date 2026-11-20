/* PROTOTYPE ONLY: REMOVE IN PRODUCTION.
   This rail lets reviewers jump between every screen in one place. The real product won't work
   this way: internal staff and external (client) users sign in to different accounts, and each
   user profile's permissions decide which screens it can reach. Build navigation per role
   instead of copying this all-screens rail.

   Left navigation: 270px open, 64px collapsed (collapses on its own at 1280px wide or less).
   Main nav, org search, the product selector and the product's sub-nav (Orders, Signatures, Documents). */

import { useCallback, useEffect, useRef, useState, type FocusEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3, ChevronDown, ChevronUp, ChevronsUpDown, ExternalLink, Feather, FileText, GraduationCap, Home,
  Package, PanelLeftClose, PanelLeftOpen, Search, Settings, Users, type LucideIcon,
} from 'lucide-react';
import { useStore } from '../data/store';
import { useDismiss } from '../components/useDismiss';
import wordmark from '../assets/cc-wordmark.svg';
import ccIcon from '../assets/cc-icon.svg';
import paradigmGray from '../assets/paradigm-logo-gray.png';
import styles from './Sidebar.module.css';

interface NavDef { to: string; label: string; icon: LucideIcon; match: (path: string) => boolean }

const MAIN_NAV: NavDef[] = [
  { to: '/', label: 'Home', icon: Home, match: (p) => p === '/' },
  { to: '/organizations', label: 'Organizations', icon: GraduationCap, match: (p) => p.startsWith('/organizations') },
  { to: '/users', label: 'Users', icon: Users, match: (p) => p.startsWith('/users') || p === '/profile' },
  { to: '/reports', label: 'Reports', icon: BarChart3, match: (p) => p.startsWith('/reports') },
  // Announcements is hidden for now in the design.
  { to: '/admin', label: 'Admin', icon: Settings, match: (p) => p.startsWith('/admin') },
];

const ORDERS_SUB = [
  { to: '/orders/credentials', label: 'Credentials' },
  { to: '/orders/reorders', label: 'Reorder Management' },
  { to: '/orders/holds', label: 'Hold Management' },
];

const PRODUCT_NAV: NavDef[] = [
  { to: '/signatures', label: 'Signatures', icon: Feather, match: (p) => p.startsWith('/signatures') },
  { to: '/documents', label: 'Documents', icon: FileText, match: (p) => p.startsWith('/documents') },
];

const COMING_SOON = ['Diploma Covers', 'Micro-credentials', 'Transcript Records'];

const NARROW = '(max-width: 1280px)';

export function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { orgs } = useStore();

  const [collapsed, setCollapsed] = useState(() => window.matchMedia(NARROW).matches);
  useEffect(() => {
    const mq = window.matchMedia(NARROW);
    const on = () => setCollapsed(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  /* ----- org search ----- */
  const [q, setQ] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const query = q.trim().toLowerCase();
  const results = (query ? orgs.filter((o) => o.name.toLowerCase().includes(query) || String(o.num).includes(query)) : orgs).slice(0, query ? 8 : 5);
  const openOrg = (num: number) => {
    setQ('');
    setSearchOpen(false);
    navigate(`/organizations/${num}`);
  };

  /* ----- product selector ----- */
  const [productOpen, setProductOpen] = useState(false);
  const [productSelected, setProductSelected] = useState(true);
  const prodWrap = useRef<HTMLDivElement>(null);
  const prodBtn = useRef<HTMLButtonElement>(null);
  const closeProduct = useCallback(() => setProductOpen(false), []);
  useDismiss(productOpen, prodWrap, closeProduct, prodBtn);

  /* ----- orders ----- */
  const inOrders = pathname.startsWith('/orders');
  const ordersParentSel = pathname === '/orders' || pathname === '/orders/new';
  const [flyOpen, setFlyOpen] = useState(false);
  const flyTimer = useRef<number>();
  const openFly = () => { window.clearTimeout(flyTimer.current); if (collapsed) setFlyOpen(true); };
  const closeFly = () => { flyTimer.current = window.setTimeout(() => setFlyOpen(false), 240); };
  const onFlyBlur = (e: FocusEvent<HTMLDivElement>) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setFlyOpen(false); };

  const go = (to: string) => navigate(to);

  return (
    <aside className={`${styles.sidebar} ${collapsed ? styles.collapsed : ''}`} aria-label="Main">
      <div className={styles.head}>
        {collapsed
          ? <img src={ccIcon} alt="Credential Connections" className={styles.mark} />
          : <img src={wordmark} alt="Credential Connections" className={styles.wordmark} />}
        <button
          type="button"
          className={styles.toggle}
          onClick={() => setCollapsed((c) => !c)}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          title={collapsed ? 'Expand' : 'Collapse'}
        >
          {collapsed ? <PanelLeftOpen size={18} aria-hidden="true" /> : <PanelLeftClose size={18} aria-hidden="true" />}
        </button>
      </div>

      {/* Search organizations */}
      {collapsed ? (
        <div className={styles.slimSearch}>
          <button type="button" className={styles.slimBtn} onClick={() => setCollapsed(false)} aria-label="Search organizations" title="Search">
            <Search size={18} aria-hidden="true" />
          </button>
        </div>
      ) : (
        <div className={styles.search}>
          <div className={`cc-input ${styles.searchField}`}>
            <Search size={16} className={styles.searchIcon} aria-hidden="true" />
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); setSearchOpen(true); }}
              onFocus={() => setSearchOpen(true)}
              onBlur={() => window.setTimeout(() => setSearchOpen(false), 150)}
              onKeyDown={(e) => { if (e.key === 'Escape') setSearchOpen(false); if (e.key === 'Enter' && results[0]) openOrg(results[0].num); }}
              placeholder="Search"
              aria-label="Search organizations by name or ID"
              className={styles.searchInput}
            />
          </div>
          {searchOpen && (
            <div className={styles.searchMenu}>
              <div className={styles.menuHeading}>{query ? 'Results' : 'Recent'}</div>
              {results.map((o) => (
                <button key={o.id} type="button" className={styles.searchResult} onMouseDown={() => openOrg(o.num)}>
                  <span className={styles.resultNum}>{o.num}</span>
                  <span className={styles.resultName}>{o.name}</span>
                </button>
              ))}
              {results.length === 0 && <div className={styles.searchEmpty}>No organizations found.</div>}
            </div>
          )}
        </div>
      )}

      <nav className={styles.nav}>
        {MAIN_NAV.map((n) => <NavItem key={n.to} def={n} selected={n.match(pathname)} onClick={() => go(n.to)} collapsed={collapsed} />)}
      </nav>

      {/* Product selector */}
      <div className={styles.products} ref={prodWrap}>
        <button ref={prodBtn} type="button" className={styles.prodBtn} onClick={() => setProductOpen((o) => !o)} aria-haspopup="true" aria-expanded={productOpen} title="Products">
          {!collapsed && <span className={styles.prodLabel}>Products</span>}
          <ChevronsUpDown size={20} className={styles.prodIcon} aria-hidden="true" />
        </button>
        {productOpen && (
          <div className={styles.prodMenu} role="group" aria-label="Products">
            <div className={styles.prodSection}>
              <div className={styles.menuHeading}>Products</div>
              <button type="button" className={`cc-btn cc-btn--secondary ${styles.prodOption}`} onClick={() => { setProductSelected(true); setProductOpen(false); }}>
                <span className={styles.dot} style={{ background: 'var(--success-500)' }} aria-hidden="true" />
                <span className={styles.prodOptionLabel}>Diplomas &amp; Certificates</span>
              </button>
            </div>
            <div className={`${styles.prodSection} ${styles.prodSoon}`}>
              <div className={styles.menuHeading}>Coming Soon</div>
              {COMING_SOON.map((c) => (
                <div key={c} className={styles.soonItem} aria-disabled="true">
                  <span className={styles.dot} style={{ background: 'var(--gray-300)' }} aria-hidden="true" />
                  <span className={styles.soonLabel}>{c}</span>
                  <ExternalLink size={16} className={styles.soonIcon} aria-hidden="true" />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Product sub-nav */}
      {productSelected && (
        <div className={styles.productNav}>
          {!collapsed && <div className={styles.productLabel}>Diplomas &amp; Certificates</div>}

          <div onMouseEnter={openFly} onMouseLeave={closeFly} onFocus={openFly} onBlur={onFlyBlur} className={styles.ordersRow}>
            <button
              type="button"
              className={styles.navItem}
              data-sel={ordersParentSel}
              aria-current={ordersParentSel ? 'page' : undefined}
              title="Orders"
              onClick={() => { setFlyOpen(false); go('/orders'); }}
            >
              <Package size={20} aria-hidden="true" />
              {!collapsed && <span className={styles.label}>Orders</span>}
              {!collapsed && (inOrders ? <ChevronUp size={16} className={styles.chev} aria-hidden="true" /> : <ChevronDown size={16} className={styles.chev} aria-hidden="true" />)}
            </button>

            {collapsed && flyOpen && (
              <div className={styles.fly}>
                <div className={styles.menuHeading}>Orders</div>
                {ORDERS_SUB.map((s) => (
                  <button key={s.to} type="button" className={`${styles.navItem} ${styles.flyItem}`} data-sel={pathname === s.to} aria-current={pathname === s.to ? 'page' : undefined} onClick={() => { setFlyOpen(false); go(s.to); }}>
                    {s.label}
                  </button>
                ))}
              </div>
            )}

            {!collapsed && inOrders && (
              <div className={styles.subNav}>
                {ORDERS_SUB.map((s) => (
                  <button key={s.to} type="button" className={styles.navItem} data-sel={pathname === s.to} aria-current={pathname === s.to ? 'page' : undefined} onClick={() => go(s.to)}>
                    <span className={styles.label}>{s.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {PRODUCT_NAV.map((n) => <NavItem key={n.to} def={n} selected={n.match(pathname)} onClick={() => go(n.to)} collapsed={collapsed} />)}
        </div>
      )}

      <div className={styles.spacer} />
      {collapsed
        ? <div className={styles.protoSlim} title="Prototype navigation. To be removed in development." aria-label="Prototype navigation. To be removed in development." role="note">Proto</div>
        : (
          <div className={styles.protoNote} role="note">
            <strong>Prototype navigation</strong>
            <span>To be removed in development. Real users sign in to an internal or external account, and their permissions set what they can reach.</span>
          </div>
        )}
      <div className={styles.foot}>
        <img src={paradigmGray} alt="Paradigm" className={collapsed ? styles.footLogoSlim : styles.footLogo} />
      </div>
    </aside>
  );
}

function NavItem({ def, selected, onClick, collapsed }: { def: NavDef; selected: boolean; onClick: () => void; collapsed: boolean }) {
  const Icon = def.icon;
  return (
    <button type="button" className={styles.navItem} data-sel={selected} aria-current={selected ? 'page' : undefined} title={def.label} onClick={onClick}>
      <Icon size={20} aria-hidden="true" />
      {!collapsed && <span className={styles.label}>{def.label}</span>}
    </button>
  );
}
