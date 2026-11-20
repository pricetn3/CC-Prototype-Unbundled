/* Users: team overview for Paradigm or one organization, with search, filters, sorting, row actions,
   and the Invite user dialog (also opened by /users/invite or /users?invite=1). */

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowDown, ArrowUp, ListFilter, MoreVertical, Pencil, Plus, Search, Send, User as UserIcon, UserPlus, UserX } from 'lucide-react';
import { useStore } from '../data/store';
import { SUB_ORGS, ageMinutes, buildUsers, isAdminRole, orgOptions, useUsersState, userRouteId, type User } from '../data/users';
import { PageHeader } from '../components/PageHeader';
import { CCTable } from '../components/CCTable';
import { SearchField } from '../components/SearchField';
import { FilterDropdown } from '../components/FilterDropdown';
import { UsersOrgPicker } from '../components/UsersOrgPicker';
import { InviteUserDialog, UserStatusDialog } from '../components/UsersDialogs';
import { useToast } from '../components/Toast';
import { useDismiss } from '../components/useDismiss';
import styles from './Users.module.css';

type FacetKey = 'access' | 'status' | 'org';
type Filters = Record<FacetKey, string[]>;
const EMPTY: Filters = { access: [], status: [], org: [] };
type SortKey = 'name' | 'title' | 'department' | 'role' | 'last';
interface Sort { key: SortKey; dir: 'asc' | 'desc' }

const COLS: { key: SortKey; label: string; width?: number }[] = [
  { key: 'name', label: 'Name & Email' },
  { key: 'title', label: 'Title', width: 170 },
  { key: 'department', label: 'Department', width: 170 },
  { key: 'role', label: 'Access', width: 140 },
  { key: 'last', label: 'Last Active', width: 210 },
];

export function Users() {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const toast = useToast();
  const { orgs } = useStore();
  const ustate = useUsersState();
  const orgOpts = useMemo(() => orgOptions(orgs), [orgs]);

  const [orgKey, setOrgKey] = useState('internal');
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState('');
  const [barOpen, setBarOpen] = useState(false);
  const [applied, setApplied] = useState<Filters>(EMPTY);
  const [draft, setDraft] = useState<Filters | null>(null);
  const [showInactive, setShowInactive] = useState(false);
  const [sort, setSort] = useState<Sort | null>(null);
  const [menu, setMenu] = useState<string | null>(null);
  const [dlg, setDlg] = useState<{ kind: 'deactivate' | 'reactivate'; user: User } | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const inviteOpen = location.pathname.replace(/\/$/, '').endsWith('/users/invite') || params.get('invite') === '1';
  const closeInvite = useCallback(() => navigate('/users', { replace: true }), [navigate]);

  const loadTimer = useRef<number>();
  useEffect(() => () => window.clearTimeout(loadTimer.current), []);
  const pickOrg = (k: string) => {
    if (k === orgKey) return;
    setOrgKey(k); setMenu(null); setLoading(true);
    window.clearTimeout(loadTimer.current);
    loadTimer.current = window.setTimeout(() => setLoading(false), 650);
  };

  const org = orgOpts.find((o) => o.key === orgKey) ?? orgOpts[0];
  const all = useMemo(() => buildUsers(org, ustate), [org, ustate]);
  const lq = q.trim().toLowerCase();
  let list = all.filter((u) => {
    if (u.inactive && !showInactive) return false;
    if (applied.access.length && !applied.access.includes(isAdminRole(u.role) ? 'Admin' : u.role)) return false;
    if (applied.status.length && !u.inactive && !applied.status.includes(u.status)) return false;
    if (applied.org.length && !applied.org.includes(u.sub)) return false;
    return !lq || [u.name, u.email, u.title, u.department].some((x) => x.toLowerCase().includes(lq));
  });
  const sortVal = (u: User, k: SortKey): string | number => (k === 'last' ? (u.inactive ? 2e9 : ageMinutes(u.lastLogin)) : String(u[k] ?? '').toLowerCase());
  list = list.map((u, i) => ({ u, i })).sort((x, y) => {
    if (sort) {
      const a = sortVal(x.u, sort.key), b = sortVal(y.u, sort.key);
      const c = a < b ? -1 : a > b ? 1 : 0;
      if (c) return sort.dir === 'desc' ? -c : c;
    } else if (x.u.inactive !== y.u.inactive) return x.u.inactive ? 1 : -1;
    return x.i - y.i;
  }).map((x) => x.u);
  const n = loading ? 0 : list.length;

  const d = draft ?? applied;
  const draftN = d.access.length + d.status.length + d.org.length;
  const appliedN = applied.access.length + applied.status.length + applied.org.length + (showInactive ? 1 : 0);
  const setFacet = (k: FacetKey, v: string[]) => setDraft({ ...d, [k]: v });
  const clearAll = () => { setApplied(EMPTY); setDraft(null); setShowInactive(false); };

  const openProfile = (u: User) => navigate(u.isMe ? '/profile' : `/users/${userRouteId(u.key)}`);
  const resend = () => { setMenu(null); toast('Successfully resent invite', "The invitation has been resent to the user's email address."); };
  const onSort = (k: SortKey) => {
    const on = sort?.key === k;
    setSort(!on ? { key: k, dir: 'asc' } : sort!.dir === 'asc' ? { key: k, dir: 'desc' } : null);
  };

  return (
    <>
      <PageHeader
        title="Users"
        subtitle="Manage your team members and their account settings."
        actions={(
          <>
            <button data-permi="inviteUsers" type="button" className="cc-btn cc-btn--primary" onClick={() => navigate('/users?invite=1')}><Plus size={16} aria-hidden="true" />Invite user</button>
            <UsersOrgPicker id="users-org" options={orgOpts} value={orgKey} onChange={pickOrg} width={280} menuWidth={320} alignEnd searchPlaceholder="Search organizations" label="Showing users for" />
          </>
        )}
      />

      <div className={styles.wrap}>
        <div className={styles.card}>
          <div className={styles.toolbar}>
            <div className={styles.toolbarTitle}>
              <h2 className={styles.cardTitle}>Team overview</h2>
              <span className="cc-badge cc-badge--brand" aria-live="polite">{n} {n === 1 ? 'user' : 'users'}</span>
            </div>
            <div className={styles.tools}>
              <SearchField ref={searchRef} id="users-search" value={q} onChange={setQ} width={320} placeholder="Search" aria-label="Search users" clearable />
              <button type="button" className="cc-btn cc-btn--secondary" aria-expanded={barOpen} aria-controls="users-fbar" onClick={() => { setBarOpen((o) => !o); setDraft(null); }}>
                <ListFilter size={18} aria-hidden="true" />Filter
                {appliedN > 0 && !barOpen && <span className={styles.filterCount}>{appliedN}</span>}
              </button>
            </div>
          </div>

          {barOpen && (
            <div id="users-fbar" className={styles.filterBar}>
              <div className={styles.filterGroup}>
                <FilterDropdown id="uf-btn-access" label="Access" options={[{ value: 'Admin', label: 'Admin' }, { value: 'Standard', label: 'Standard' }]} selected={d.access} onChange={(v) => setFacet('access', v)} />
                <FilterDropdown id="uf-btn-status" label="Status" options={[{ value: 'online', label: 'Online' }, { value: 'offline', label: 'Offline' }, { value: 'pending', label: 'Invite Pending' }]} selected={d.status} onChange={(v) => setFacet('status', v)} />
                <FilterDropdown id="uf-btn-org" label="Organization" width={440} options={SUB_ORGS.map(([num, name]) => ({ value: num, label: name, meta: num }))} selected={d.org} onChange={(v) => setFacet('org', v)} />
                <label htmlFor="users-inactive" className={styles.inactive}>
                  <input className="cc-checkbox__input" id="users-inactive" type="checkbox" checked={showInactive} onChange={(e) => setShowInactive(e.target.checked)} />Show Inactive
                </label>
              </div>
              {(draftN > 0 || appliedN > 0) && (
                <div className={styles.filterActions}>
                  <button type="button" className="cc-link cc-link-btn" onClick={clearAll}>Clear all</button>
                  <button type="button" className="cc-btn cc-btn--secondary cc-btn--sm" onClick={() => { setApplied({ ...EMPTY, ...d }); setDraft(null); }}>Apply filters</button>
                </div>
              )}
            </div>
          )}

          <CCTable minWidth="1000px" label="Users">
            <thead>
              <tr>
                {COLS.map((c, i) => {
                  const on = sort?.key === c.key;
                  return (
                    <th key={c.key} className={`${styles.sortTh} ${on ? styles.sortOn : ''}`} style={{ width: c.width }} aria-sort={on ? (sort!.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
                      <button type="button" className={styles.sortBtn} style={i === 0 ? { paddingLeft: 'var(--space-5)' } : undefined} onClick={() => onSort(c.key)}>
                        {c.label}
                        {on && (sort!.dir === 'asc' ? <ArrowUp size={14} aria-hidden="true" /> : <ArrowDown size={14} aria-hidden="true" />)}
                      </button>
                    </th>
                  );
                })}
                <th style={{ width: 56 }}><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {!loading && list.map((u, idx) => (
                <UserRow
                  key={u.key} u={u} up={list.length > 5 && idx >= list.length - 3}
                  menuOpen={menu === u.key} setMenu={(o) => setMenu(o ? u.key : null)}
                  onOpen={() => openProfile(u)}
                  onEdit={() => navigate((u.isMe ? '/profile' : `/users/${userRouteId(u.key)}`) + '?edit=1')}
                  onResend={resend}
                  onStatus={(kind) => { setMenu(null); setDlg({ kind, user: u }); }}
                />
              ))}
            </tbody>
          </CCTable>

          <div role="status" aria-live="polite">
            {loading && (
              <div className={styles.loading}><span className={styles.spinner} aria-hidden="true" />Loading users...</div>
            )}
            {!loading && n === 0 && (
              <div className={styles.empty}>
                <span className={styles.emptyIcon} aria-hidden="true"><Search size={22} /></span>
                <div className={styles.emptyTitle}>No users found!</div>
                <div className={styles.emptyText}>Your search did not match any users. Please try again or add a new user.</div>
                <div className={styles.emptyActions}>
                  <button type="button" className="cc-btn cc-btn--secondary" onClick={() => { setQ(''); setApplied(EMPTY); setDraft(null); }}>Clear search</button>
                  <button data-permi="inviteUsers" type="button" className="cc-btn cc-btn--primary" onClick={() => navigate('/users?invite=1')}><Plus size={16} aria-hidden="true" />Invite user</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {inviteOpen && <InviteUserDialog onClose={closeInvite} />}
      {dlg && <UserStatusDialog kind={dlg.kind} user={dlg.user} onClose={() => setDlg(null)} />}
    </>
  );
}

function UserRow({ u, up, menuOpen, setMenu, onOpen, onEdit, onResend, onStatus }: {
  u: User; up: boolean; menuOpen: boolean; setMenu: (open: boolean) => void;
  onOpen: () => void; onEdit: () => void; onResend: () => void; onStatus: (kind: 'deactivate' | 'reactivate') => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setMenu(false), [setMenu]);
  useDismiss(menuOpen, wrap, close, btn);
  useEffect(() => { if (menuOpen) menuRef.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus(); }, [menuOpen]);

  const pend = u.status === 'pending';
  const onMenuKey = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    const items = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]'));
    const i = items.indexOf(document.activeElement as HTMLElement);
    const next = e.key === 'ArrowDown' ? (i + 1) % items.length : (i - 1 + items.length) % items.length;
    items[next]?.focus();
  };

  return (
    <tr
      className={styles.row} tabIndex={0}
      aria-label={`${u.name}, ${u.role}${u.inactive ? ', inactive' : pend ? ', invite pending' : ''}. Open profile`}
      onClick={(e) => { if ((e.target as HTMLElement).closest('button, a, input, label, [role="menu"]')) return; onOpen(); }}
      onKeyDown={(e) => { if (e.target !== e.currentTarget) return; if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpen(); } }}
    >
      <td className={styles.firstCell}>
        <div className={styles.person}>
          <span className={styles.avatar} aria-hidden="true">{u.initials}{u.status === 'online' && <span className={styles.online} title="Online" />}</span>
          <span style={{ minWidth: 0 }}>
            <span className={`${styles.trunc} ${styles.name} ${u.inactive ? styles.nameInactive : ''}`} title={u.name}>{u.name}</span>
            <span className={`${styles.trunc} ${styles.email}`} title={u.email}>{u.email}</span>
          </span>
        </div>
      </td>
      <td className={styles.muted} style={{ maxWidth: 170 }}><span className={styles.trunc} title={u.title}>{u.title}</span></td>
      <td className={styles.muted} style={{ maxWidth: 170 }}><span className={styles.trunc} title={u.department}>{u.department}</span></td>
      <td><span className={`cc-badge cc-badge--square ${isAdminRole(u.role) ? styles.roleAdmin : styles.roleStd}`}>{u.role}</span></td>
      <td className={styles.muted}>
        {pend && (
          <span className={styles.pendWrap}>
            <span className={`${styles.pill} ${styles.pending}`}><span className={styles.pillDot} aria-hidden="true" />Invite pending</span>
            <button type="button" className="cc-icon-btn cc-icon-btn--xs" title="Resend invite" aria-label={`Resend invite to ${u.name}`} onClick={onResend}><Send size={16} aria-hidden="true" /></button>
          </span>
        )}
        {u.inactive && <span className={`${styles.pill} ${styles.inactivePill}`}><span className={styles.pillDot} aria-hidden="true" />Inactive</span>}
        {!pend && !u.inactive && (u.lastLogin || '—')}
      </td>
      <td className={styles.actionsCell}>
        <div className="cc-dropdown" ref={wrap} style={{ display: 'inline-block' }}>
          <button data-permi="adminUsers" ref={btn} type="button" className="cc-icon-btn cc-icon-btn--xs" aria-label={`Actions for ${u.name}`} aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenu(!menuOpen)}>
            <MoreVertical size={18} aria-hidden="true" />
          </button>
          {menuOpen && (
            <div ref={menuRef} role="menu" aria-label={`Actions for ${u.name}`} onKeyDown={onMenuKey}
              className={`cc-dropdown__menu cc-dropdown__menu--end ${up ? 'cc-dropdown__menu--up' : ''} ${styles.menu}`}>
              <div className={styles.menuHead}>
                <span className={styles.menuAvatar} aria-hidden="true">{u.initials}</span>
                <span style={{ minWidth: 0 }}>
                  <span className={`${styles.trunc} ${styles.menuName}`}>{u.name}</span>
                  <span className={`${styles.trunc} ${styles.menuEmail}`}>{u.email}</span>
                </span>
              </div>
              <div className={styles.menuGroup}>
                <button type="button" role="menuitem" className={styles.menuItem} onClick={onOpen}><UserIcon size={16} aria-hidden="true" />View profile</button>
                {!u.inactive && <button type="button" role="menuitem" className={styles.menuItem} onClick={onEdit}><Pencil size={16} aria-hidden="true" />Edit details</button>}
                {pend && <button type="button" role="menuitem" className={styles.menuItem} onClick={onResend}><Send size={16} aria-hidden="true" />Resend invite</button>}
              </div>
              {!u.isMe && (
                <div className={styles.menuGroup}>
                  {u.inactive
                    ? <button type="button" role="menuitem" className={styles.menuItem} onClick={() => onStatus('reactivate')}><UserPlus size={16} aria-hidden="true" />Reactivate user</button>
                    : <button type="button" role="menuitem" className={`${styles.menuItem} ${styles.menuDanger}`} onClick={() => onStatus('deactivate')}><UserX size={16} aria-hidden="true" />Deactivate user</button>}
                </div>
              )}
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
