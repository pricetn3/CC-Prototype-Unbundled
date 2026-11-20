/* PROTOTYPE ONLY. Never part of the production build (loaded from main.tsx only when running locally).
   Who the viewer is pretending to be: IT Admin, or Standard with some additional permissions.
   Saved in this browser so it survives reloads. The design keeps it under the same key ('cc-perm-int'). */

import { PERM_GROUPS, type Perms } from '../data/users';

export type Role = 'admin' | 'standard';
export interface Access { role: Role; perms: Perms }

const KEY = 'cc-perm-int';
/** Rights only IT Admin has; Standard never gets them. */
const ADMIN_ONLY = ['adminUsers', 'adminCredActions', 'manageSignatures'];
export const ALL_KEYS = PERM_GROUPS.flatMap((g) => g.items.map((i) => i[0]));

export function readAccess(): Access {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && (v.role === 'admin' || v.role === 'standard')) return { role: v.role, perms: v.perms ?? {} };
  } catch { /* storage blocked: fall back to IT Admin */ }
  return { role: 'admin', perms: {} };
}

export function writeAccess(a: Access) {
  try { localStorage.setItem(KEY, JSON.stringify(a)); } catch { /* ignore */ }
  applyAccess(a);
}

/** Every right, on or off, for this access. Mirrors the design's permEff(). */
export function effective(a: Access): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  ALL_KEYS.concat(ADMIN_ONLY).forEach((k) => {
    out[k] = a.role === 'admin' ? true : ADMIN_ONLY.includes(k) ? false : !!a.perms[k];
  });
  out.inviteUsers = out.adminUsers || out.addFirstUser;
  out.anyReports = out.viewCredReports || out.viewReorderReports;
  return out;
}

/** Lists the missing rights on <html data-npi="…">. gating.css hides any element whose data-permi names one. */
export function applyAccess(a: Access) {
  const eff = effective(a);
  document.documentElement.setAttribute('data-npi', Object.keys(eff).filter((k) => !eff[k]).join(' '));
}
