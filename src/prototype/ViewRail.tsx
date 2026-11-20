/* PROTOTYPE ONLY: NOT PART OF THE PRODUCT.
   The white panel on the right edge (the design's "ViewRail"). It lets reviewers and developers act as a
   different kind of user without signing out: pick the view, change permissions, and load sample org
   settings. main.tsx loads this folder only when the app runs locally (npm run dev), so it never reaches
   the production build. Shift+H hides and shows it. */

import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronLeft, X } from 'lucide-react';
import { useStore } from '../data/store';
import { ROLES } from '../data/users';
import { AccessPicker } from '../components/UsersDialogs';
import { ALL_KEYS, applyAccess, readAccess, writeAccess, type Access } from './access';
import { SCENARIOS, scenarioFor, type Scenario } from './scenarios';
import './gating.css';
import s from './ViewRail.module.css';

const HIDDEN_KEY = 'cc-viewrail-hidden';
const readOpen = () => { try { return localStorage.getItem(HIDDEN_KEY) !== '1'; } catch { return true; } };

export default function ViewRail() {
  const [open, setOpenState] = useState(readOpen);
  const [access, setAccessState] = useState<Access>(readAccess);
  const [editing, setEditing] = useState(false);
  const [scn, setScn] = useState<Scenario | null>(null);
  const { orgs, updateOrg } = useStore();
  const loc = useLocation();

  const setOpen = (v: boolean) => {
    try { localStorage.setItem(HIDDEN_KEY, v ? '0' : '1'); } catch { /* ignore */ }
    setOpenState(v);
  };
  const setAccess = (a: Access) => { writeAccess(a); setAccessState(a); };

  useEffect(() => { applyAccess(access); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Shift+H toggles the panel, except while typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.shiftKey || e.key.toLowerCase() !== 'h') return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
      setOpenState((o) => { const v = !o; try { localStorage.setItem(HIDDEN_KEY, v ? '0' : '1'); } catch { /* ignore */ } return v; });
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Org settings samples show on an org's Settings tab.
  const m = loc.pathname.match(/^\/organizations\/(\d+)\/?$/);
  const org = m ? orgs.find((o) => String(o.num) === m[1]) : undefined;
  const onSettings = !!org && new URLSearchParams(loc.search).get('tab') === 'settings';
  useEffect(() => { setScn(null); }, [org?.id]);

  const pickScenario = (k: Scenario) => {
    if (!org) return;
    const r = scenarioFor(org, k);
    updateOrg(org.id, { setup: { ...org.setup, ...r.setup }, displayName: r.displayName });
    // SettingsTab listens for this and swaps in the sample settings.
    window.dispatchEvent(new CustomEvent('cc-proto-settings', { detail: { orgId: org.id, settings: r.settings } }));
    setScn(k);
  };

  // Escape closes the permissions editor; focus its title when it opens.
  useEffect(() => {
    if (!editing) return;
    document.getElementById('vr-perm-title')?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setEditing(false); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [editing]);

  if (!open) {
    return (
      <button type="button" className={s.tab} onClick={() => setOpen(true)} aria-label="Show prototype panel">
        <ChevronLeft size={14} aria-hidden="true" />
      </button>
    );
  }

  const isStd = access.role === 'standard';
  const nOn = ALL_KEYS.filter((k) => access.perms[k]).length;

  return (
    <>
      <aside className={s.rail} aria-label="Prototype panel">
        <button type="button" className={s.hide} onClick={() => { setEditing(false); setOpen(false); }} aria-label="Hide prototype panel">
          <X size={14} aria-hidden="true" />
        </button>
        <div className={s.title}>Prototype</div>

        <div className={s.label}>View</div>
        <div className={s.seg}>
          <div className={`${s.opt} ${s.optOn}`} aria-current="true">Internal</div>
          <div className={`${s.opt} ${s.optOff}`} aria-disabled="true" title="The External platform isn't built in this app yet">
            External <span className={s.soon}>Not built</span>
          </div>
        </div>

        {onSettings && (
          <>
            <div className={s.label}>Org settings</div>
            <div className={s.seg} role="group" aria-label="Sample org settings">
              {SCENARIOS.map(([k, label]) => (
                <button key={k} type="button" className={`${s.opt} ${scn === k ? s.optOn : ''}`} aria-pressed={scn === k} onClick={() => pickScenario(k)}>
                  {label}
                </button>
              ))}
            </div>
          </>
        )}

        <div className={s.label}>Permissions</div>
        <div className={s.perm}>
          <div className={s.permRole}>{isStd ? `${ROLES.standard[0]} user` : ROLES.admin[0]}</div>
          <div className={s.permSum}>{isStd ? `${nOn} of ${ALL_KEYS.length} additional permissions` : 'All permissions'}</div>
        </div>
        <button type="button" className={`cc-btn cc-btn--secondary cc-btn--sm ${s.edit}`} aria-expanded={editing} aria-controls="vr-perm-panel" onClick={() => setEditing(!editing)}>
          Edit permissions
        </button>

        <div className={s.foot}>Shift+H hides this panel</div>
      </aside>

      {editing && (
        <div id="vr-perm-panel" className={s.editor} role="dialog" aria-labelledby="vr-perm-title">
          <div className={s.edHead}>
            <h2 id="vr-perm-title" tabIndex={-1} className={s.edTitle}>Edit permissions · Internal</h2>
            <p className={s.edSub}>See the prototype as a user with these permissions. Changes apply right away.</p>
            <button type="button" className={`cc-icon-btn ${s.edClose}`} onClick={() => setEditing(false)} aria-label="Close permissions">
              <X size={16} aria-hidden="true" />
            </button>
          </div>
          <div className={s.edBody}>
            <AccessPicker
              role={access.role}
              setRole={(role) => setAccess({ ...access, role })}
              perms={access.perms}
              setPerms={(perms) => setAccess({ ...access, perms })}
              pfx="vr"
            />
          </div>
          <div className={s.edFoot}>
            <button type="button" className="cc-link cc-link-btn" onClick={() => setAccess({ role: 'admin', perms: Object.fromEntries(ALL_KEYS.map((k) => [k, true])) })}>
              Reset to all permissions
            </button>
            <button type="button" className="cc-btn cc-btn--primary cc-btn--sm" onClick={() => setEditing(false)}>Done</button>
          </div>
        </div>
      )}
    </>
  );
}
