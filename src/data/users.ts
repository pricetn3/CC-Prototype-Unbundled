/* Users: sample roster, access roles and permissions, ported from the prototype.
   Edits (profile, access, deactivate) and invites live in a small in-memory store shared by Users and Profile. Resets on reload. */

import { useSyncExternalStore } from 'react';
import { CURRENT_USER } from './store';

export type UserStatus = 'online' | 'offline' | 'pending' | 'inactive';
export type Perms = Record<string, boolean>;

export interface User {
  key: string;
  orgKey: string;
  handle: string;
  isMe: boolean;
  name: string;
  first: string;
  last: string;
  title: string;
  department: string;
  role: string;
  perms: Perms;
  lastLogin: string;
  pending: boolean;
  inactive: boolean;
  email: string;
  phone: string;
  ext: string;
  sub: string;
  updatedAt: string;
  updatedBy: string;
  status: UserStatus;
  initials: string;
}

export interface UserOrgOption { key: string; num: string; name: string; domain: string }

/** The signed-in internal admin (Jordan Avery). */
export const ME_PROFILE = {
  name: CURRENT_USER.name, handle: 'javery', title: 'Assistant Registrar', department: 'Diplomas',
  email: CURRENT_USER.email, phone: '+1 (555) 000-0000', ext: '231', access: 'Admin',
  lastLogin: 'Just now', updatedAt: '04/28/2026 9:39:03 AM', updatedBy: 'paradigm@incorporated.com',
};
export const INTERNAL_ORG: UserOrgOption = { key: 'internal', num: '', name: 'Paradigm (internal)', domain: 'paradigm-corp.com' };

type RosterRow = [name: string, handle: string, title: string, department: string, role: string, lastLogin: string, pending: boolean, inactive?: boolean];
const ROSTER: RosterRow[] = [
  [ME_PROFILE.name, ME_PROFILE.handle, ME_PROFILE.title, ME_PROFILE.department, ME_PROFILE.access, ME_PROFILE.lastLogin, false],
  ['Sophia Greene', 'sophia', 'Manager', 'Registrar', 'Standard', '', true],
  ['Noah Patel', 'noah', 'Director', 'Registrar', 'Standard', 'Just now', false],
  ['Sarah Jones', 'sarah', 'Director', 'IT', 'Admin', 'Just now', false],
  ['Mia Thompson', 'mia', 'Manager', 'Finance', 'Standard', '3 minutes ago', false],
  ['James Adams', 'james', 'Director', 'Marketing', 'Admin', '5 minutes ago', false],
  ['Ava Lee', 'ava', 'Manager', 'Diplomas', 'Standard', '15 minutes ago', false],
  ['Elijah White', 'elijah', 'Assistant', 'Registrar', 'Standard', '1 hour ago', false],
  ['Isabella Martinez', 'isabella', 'Assistant', 'Registrar', 'Standard', '2 hours ago', false],
  ['Tessa Kim', 'tessa', 'Team Lead', 'Diplomas', 'Standard', '4 hours ago', false],
  ['Riley Chen', 'riley', 'Assistant', 'Registrar', 'Standard', 'Yesterday', false],
  ['Lucas Johnson', 'lucas', 'Director', 'Finance', 'Admin', '3 days ago', false],
  ['Grace Okafor', 'grace', 'Manager', 'Registrar', 'Standard', '5 days ago', false],
  ['Henry Alvarez', 'henry', 'Assistant', 'IT', 'Standard', '1 week ago', false],
  ['Nina Duarte', 'nina', 'Team Lead', 'Marketing', 'Standard', '2 weeks ago', false],
  ['Owen Reilly', 'owen', 'Assistant', 'Finance', 'Standard', '', true],
  ['Priya Nair', 'priya', 'Manager', 'IT', 'Admin', '3 weeks ago', false],
  ['Marcus Webb', 'marcus', 'Manager', 'Finance', 'Standard', '2 months ago', false, true],
  ['Hannah Cole', 'hannah', 'Assistant', 'Diplomas', 'Admin', '3 months ago', false, true],
  ['Victor Lin', 'victor', 'Director', 'IT', 'Standard', '5 months ago', false, true],
];

export const SUB_ORGS: [string, string][] = [
  ['1800', 'Harvard Faculty of Arts and Sciences'], ['1801', 'Harvard Graduate School of Design'], ['1802', 'Harvard Business School'],
  ['1803', 'Harvard Medical School'], ['1804', 'Harvard Graduate School of Education'], ['1805', 'Harvard Divinity School'],
];

/** Organizations offered when inviting a user (prototype list). */
export const INVITE_ORGS: { num: string; name: string }[] = [
  { num: '1800', name: 'Harvard University' }, { num: '1801', name: 'Harvard Graduate School of Design' },
  { num: '1802', name: 'Harvard Business School' }, { num: '2400', name: 'Virginia Hancock University' },
];

export interface PermGroup { key: string; label: string; items: [key: string, label: string, desc?: string][] }
export const PERM_GROUPS: PermGroup[] = [
  { key: 'orders', label: 'Orders', items: [['manageOrders', 'Manage orders']] },
  { key: 'orgs', label: 'Organizations', items: [['manageOrgs', 'Manage organizations'], ['manageOrgSettings', 'Manage organization configuration', 'Edit the Settings tab on organization profiles and country shipping in Admin. Everyone can view these and the Action log.']] },
  { key: 'users', label: 'Users', items: [['addFirstUser', 'Add first user to organizations']] },
  { key: 'docs', label: 'Documents', items: [['manageClientDocs', 'Manage client documents'], ['manageHelpfulDocs', 'Manage helpful documents']] },
  { key: 'reorders', label: 'Reorder Management', items: [['manageReorders', 'Manage reorders']] },
  { key: 'holds', label: 'Hold Management', items: [['manageHolds', 'Manage hold records']] },
  { key: 'reports', label: 'Reports', items: [['viewCredReports', 'View credential reports'], ['viewReorderReports', 'View student reorder reports']] },
];
export const ROLES = {
  admin: ['IT Admin', 'Full access to view and manage all areas of the platform, including orders, organizations, users, signatures, documents, and reports.'],
  standard: ['Standard', 'View-only access to orders, organizations, users, signatures, and documents, with optional permissions to manage specific areas of the platform.'],
} as const;
export const emptyPerms = (): Perms => {
  const p: Perms = {};
  PERM_GROUPS.forEach((g) => g.items.forEach((i) => { p[i[0]] = false; }));
  return p;
};
export const isAdminRole = (role: string) => role === 'Admin' || role === 'IT Admin';

export function initialsOf(name: string) {
  const w = name.trim().split(/\s+/).filter(Boolean);
  return ((w[0]?.[0] ?? '?') + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
}

/** Minutes since a relative "last active" label, for sorting and the online dot. */
export function ageMinutes(s: string) {
  const v = s.toLowerCase();
  if (!v) return 1e9;
  if (v === 'just now') return 0;
  if (v === 'yesterday') return 1440;
  const m = /(\d+)\s*(minute|hour|day|week|month)/.exec(v);
  if (!m) return 1e8;
  return Number(m[1]) * ({ minute: 1, hour: 60, day: 1440, week: 10080, month: 43200 } as Record<string, number>)[m[2]];
}

export function stampNow() {
  const d = new Date();
  const p2 = (n: number) => String(n).padStart(2, '0');
  const h = d.getHours() % 12 || 12;
  return `${p2(d.getMonth() + 1)}/${p2(d.getDate())}/${d.getFullYear()} ${h}:${p2(d.getMinutes())}:${p2(d.getSeconds())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}

/* ---------- shared in-memory store ---------- */
interface Invited { name: string; handle: string; email: string; phone: string; ext: string; title: string; department: string; role: string; perms: Perms; orgKey: string }
interface State { overrides: Record<string, Partial<User>>; invited: Invited[] }
let state: State = { overrides: {}, invited: [] };
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function useUsersState() {
  return useSyncExternalStore(subscribe, () => state);
}
export function patchUser(key: string, patch: Partial<User>) {
  state = { ...state, overrides: { ...state.overrides, [key]: { ...state.overrides[key], ...patch } } };
  emit();
}
export function addInvite(inv: Invited) {
  state = { ...state, invited: [inv, ...state.invited] };
  emit();
}

/** Users for one organization ('internal' is Paradigm's own team). */
export function buildUsers(org: UserOrgOption, s: State): User[] {
  const roster = org.key === 'internal' ? ROSTER.slice(0, 9).concat(ROSTER.filter((r) => r[7])) : ROSTER;
  const p2 = (n: number) => String(n).padStart(2, '0');
  const invited = s.invited.filter((i) => i.orgKey === org.key || org.key === 'internal');
  const base = invited.map((i) => ({ name: i.name, handle: i.handle, title: i.title, department: i.department, role: i.role, lastLogin: '', pending: true, inactive: false, email: i.email, phone: i.phone, ext: i.ext, perms: i.perms }))
    .concat(roster.map((r) => ({ name: r[0], handle: r[1], title: r[2], department: r[3], role: r[4], lastLogin: r[5], pending: r[6], inactive: !!r[7], email: '', phone: '', ext: '', perms: {} as Perms })));
  return base.map((u, i) => {
    const key = org.key + ':' + u.handle;
    const isMe = org.key === 'internal' && u.handle === ME_PROFILE.handle;
    const nm = u.name.split(/\s+/);
    let r: User = {
      key, orgKey: org.key, handle: u.handle, isMe, name: u.name, first: nm[0] ?? '', last: nm.slice(1).join(' '),
      title: u.title, department: u.department, role: u.role, perms: u.perms, lastLogin: u.lastLogin, pending: u.pending, inactive: u.inactive,
      email: u.email || `${u.handle}@${org.domain}`,
      phone: u.phone || `+1 (555) ${210 + ((i * 37) % 700)}-${1000 + ((i * 7919) % 9000)}`,
      ext: u.email ? u.ext : i % 3 === 0 ? '' : String(100 + i * 13),
      sub: SUB_ORGS[i % SUB_ORGS.length][0],
      updatedAt: `04/${p2(8 + (i % 18))}/2026 ${9 + (i % 3)}:${p2((11 + i * 7) % 60)}:03 AM`, updatedBy: 'paradigm@incorporated.com',
      status: 'offline', initials: '',
    };
    if (isMe) r = { ...r, email: ME_PROFILE.email, phone: ME_PROFILE.phone, ext: ME_PROFILE.ext, updatedAt: ME_PROFILE.updatedAt, updatedBy: ME_PROFILE.updatedBy };
    const o = s.overrides[key];
    if (o) {
      r = { ...r, ...o };
      if (o.first != null || o.last != null) r.name = `${r.first} ${r.last}`.trim();
    }
    r.status = r.inactive ? 'inactive' : r.pending ? 'pending' : ageMinutes(r.lastLogin) <= 60 ? 'online' : 'offline';
    r.initials = initialsOf(r.name || '?');
    return r;
  });
}

export function orgOptions(orgs: { id: string; num: number; name: string }[]): UserOrgOption[] {
  return [INTERNAL_ORG].concat(orgs.map((o) => ({ key: o.id, num: String(o.num), name: o.name, domain: 'organization.com' })));
}

/** Route id for a user (URL-safe form of the key). */
export const userRouteId = (key: string) => encodeURIComponent(key);
