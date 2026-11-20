/* Users dialogs: Invite user (2 steps), Deactivate / Reactivate user, Edit user access, Change password.
   Shared by the Users list and the profile pages. */

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronDown, Eye, EyeOff, Minus, Shield, UserCheck, UserPlus, UserX, X } from 'lucide-react';
import { useToast } from './Toast';
import { UsersOrgPicker } from './UsersOrgPicker';
import {
  INVITE_ORGS, PERM_GROUPS, ROLES, addInvite, emptyPerms, isAdminRole, patchUser, stampNow,
  type Perms, type User,
} from '../data/users';
import { CURRENT_USER } from '../data/store';
import s from './UsersDialogs.module.css';

/* ---------- modal shell: Esc closes, focus to the title on open and back to the opener on close ---------- */
function useModal(onClose: () => void, titleId: string) {
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    document.getElementById(titleId)?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); opener?.focus?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

function Shell({ titleId, icon, title, sub, onClose, children, footer, extraHead }: {
  titleId: string; icon: ReactNode; title: string; sub: string; onClose: () => void; children: ReactNode; footer: ReactNode; extraHead?: ReactNode;
}) {
  useModal(onClose, titleId);
  return (
    <div className="cc-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className={s.panel}>
        <div className={s.head}>
          <div className={s.headRow}>
            <span className={s.headIcon} aria-hidden="true">{icon}</span>
            <div>
              <h2 id={titleId} tabIndex={-1} className={s.title}>{title}</h2>
              <p className={s.sub}>{sub}</p>
            </div>
          </div>
          <button type="button" className={`cc-icon-btn ${s.close}`} aria-label="Close" onClick={onClose}><X size={20} aria-hidden="true" /></button>
          {extraHead}
        </div>
        <div className={s.body}>{children}</div>
        <div className={s.foot}>{footer}</div>
      </div>
    </div>
  );
}

/* ---------- access radio cards + permission tree ---------- */
type TriState = 'all' | 'some' | 'none';
function TriBox({ state }: { state: TriState }) {
  return (
    <span aria-hidden="true" style={{
      width: 16, height: 16, flexShrink: 0, boxSizing: 'border-box', borderRadius: 'var(--radius-xxs, 4px)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: state === 'none' ? 'var(--bg-primary)' : 'var(--blue-600)', border: `1px solid ${state === 'none' ? 'var(--border-input)' : 'var(--blue-600)'}`, color: 'var(--bg-primary)',
    }}>
      {state === 'all' && <Check size={12} strokeWidth={3} />}
      {state === 'some' && <Minus size={12} strokeWidth={3} />}
    </span>
  );
}
const ariaOf = (t: TriState) => (t === 'all' ? 'true' : t === 'some' ? 'mixed' : 'false');

function PermTree({ perms, setPerms, pfx }: { perms: Perms; setPerms: (p: Perms) => void; pfx: string }) {
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const all = PERM_GROUPS.flatMap((g) => g.items.map((i) => i[0]));
  const nOn = all.filter((k) => perms[k]).length;
  const allState: TriState = nOn === all.length ? 'all' : nOn ? 'some' : 'none';
  const anyOpen = PERM_GROUPS.some((g) => open[g.key] !== false);
  return (
    <div className={s.tree}>
      <div className={s.treeHead}>Additional permissions <span className={s.optional}>(optional)</span></div>
      <div className={s.treeBar}>
        <button type="button" role="checkbox" aria-checked={ariaOf(allState)} className={`cc-link-btn ${s.allCheck}`}
          onClick={() => { const p: Perms = {}; all.forEach((k) => { p[k] = allState !== 'all'; }); setPerms(p); }}>
          <TriBox state={allState} />Select all permissions
        </button>
        <button type="button" className="cc-link cc-link-btn" onClick={() => { const o: Record<string, boolean> = {}; PERM_GROUPS.forEach((g) => { o[g.key] = !anyOpen; }); setOpen(o); }}>
          {anyOpen ? 'Collapse all' : 'Expand all'}
        </button>
      </div>
      {PERM_GROUPS.map((g) => {
        const keys = g.items.map((i) => i[0]);
        const n = keys.filter((k) => perms[k]).length;
        const st: TriState = n === keys.length ? 'all' : n ? 'some' : 'none';
        const isOpen = open[g.key] !== false;
        const panelId = `${pfx}-g-${g.key}`;
        return (
          <div key={g.key} className={s.group}>
            <div className={s.groupHead}>
              <button type="button" role="checkbox" aria-checked={ariaOf(st)} className={`cc-link-btn ${s.groupCheck}`}
                onClick={() => { const p = { ...perms }; keys.forEach((k) => { p[k] = st !== 'all'; }); setPerms(p); }}>
                <TriBox state={st} />{g.label}
              </button>
              <span className={s.count}>{n}/{keys.length}</span>
              <button type="button" className="cc-icon-btn cc-icon-btn--xs" aria-expanded={isOpen} aria-controls={panelId} aria-label={`Show ${g.label} permissions`}
                onClick={() => setOpen({ ...open, [g.key]: !isOpen })}>
                <ChevronDown size={16} aria-hidden="true" className={`${s.chev} ${isOpen ? s.chevOpen : ''}`} />
              </button>
            </div>
            <div id={panelId} className={s.items} style={{ display: isOpen ? 'grid' : 'none' }}>
              {g.items.map(([k, label, desc]) => (
                <label key={k} htmlFor={`${pfx}-p-${k}`} className={s.item}>
                  <input className="cc-checkbox__input" id={`${pfx}-p-${k}`} type="checkbox" checked={!!perms[k]} onChange={(e) => setPerms({ ...perms, [k]: e.target.checked })} />
                  <span><span className={s.itemLabel}>{label}</span>{desc && <span className={s.itemDesc}>{desc}</span>}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AccessPicker({ role, setRole, perms, setPerms, pfx }: { role: string; setRole: (r: 'admin' | 'standard') => void; perms: Perms; setPerms: (p: Perms) => void; pfx: string }) {
  return (
    <>
      <h3 className={s.h3}>Access</h3>
      <div role="radiogroup" aria-label="Access" className={s.roles}>
        <div className={`${s.roleCard} ${role === 'admin' ? s.roleCardOn : ''}`}>
          <label htmlFor={`${pfx}-r-admin`} className={s.roleLabel}>
            <input className="cc-radio__input" id={`${pfx}-r-admin`} type="radio" name={`${pfx}-role`} checked={role === 'admin'} onChange={() => setRole('admin')} />
            <span><span className={s.roleName}>{ROLES.admin[0]}</span><span className={s.roleDesc}>{ROLES.admin[1]}</span></span>
          </label>
        </div>
        <div className={`${s.roleCard} ${role === 'standard' ? s.roleCardOn : ''}`}>
          <label htmlFor={`${pfx}-r-std`} className={s.roleLabel}>
            <input className="cc-radio__input" id={`${pfx}-r-std`} type="radio" name={`${pfx}-role`} checked={role === 'standard'} onChange={() => setRole('standard')} />
            <span><span className={s.roleName}>{ROLES.standard[0]}</span><span className={s.roleDesc}>{ROLES.standard[1]}</span></span>
          </label>
          {role === 'standard' && <PermTree perms={perms} setPerms={setPerms} pfx={pfx} />}
        </div>
      </div>
    </>
  );
}

/* ---------- Invite user ---------- */
type InvKey = 'first' | 'last' | 'email' | 'phone' | 'ext' | 'title' | 'dept';
export function InviteUserDialog({ onClose, onInvited }: { onClose: () => void; onInvited?: (name: string) => void }) {
  const toast = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [tried, setTried] = useState(false);
  const [org, setOrg] = useState('1800');
  const [v, setV] = useState<Record<InvKey, string>>({ first: '', last: '', email: '', phone: '', ext: '', title: '', dept: '' });
  const [role, setRole] = useState<'' | 'admin' | 'standard'>('');
  const [perms, setPerms] = useState<Perms>(emptyPerms);

  const errs: Partial<Record<InvKey | 'org', string>> = {};
  (['first', 'last', 'title', 'dept'] as InvKey[]).forEach((k) => { if (!v[k].trim()) errs[k] = 'This field is required.'; });
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email.trim())) errs.email = v.email.trim() ? 'Enter a valid email address, like name@school.edu.' : 'This field is required.';
  if (v.phone.replace(/\D/g, '').length < 10) errs.phone = v.phone.trim() ? 'Enter a 10-digit phone number.' : 'This field is required.';
  if (!org) errs.org = 'Select an organization.';

  const field = (k: InvKey, label: string, ph: string, req: boolean, type = 'text') => {
    const e = tried ? errs[k] : '';
    return (
      <div>
        <label htmlFor={`inv-${k}`} className={s.label}>{label}{req && <> <span aria-hidden="true" className={s.req}>*</span></>}</label>
        <input id={`inv-${k}`} type={type} className="cc-input" placeholder={ph} value={v[k]} aria-required={req || undefined}
          aria-invalid={e ? true : undefined} aria-describedby={e ? `inv-${k}-err` : undefined}
          onChange={(ev) => setV({ ...v, [k]: ev.target.value })} />
        {e && <p id={`inv-${k}-err`} className={s.err}>{e}</p>}
      </div>
    );
  };

  const onContinue = () => {
    const first = (['org', 'first', 'last', 'email', 'phone', 'title', 'dept'] as const).find((k) => errs[k]);
    if (first) { setTried(true); setTimeout(() => document.getElementById(first === 'org' ? 'op-inv' : `inv-${first}`)?.focus(), 30); return; }
    setStep(2);
    setTimeout(() => document.getElementById('inv-title')?.focus(), 30);
  };
  const onSend = () => {
    if (!role) return;
    const name = `${v.first.trim()} ${v.last.trim()}`;
    addInvite({
      name, handle: 'inv' + Date.now(), email: v.email.trim(), phone: v.phone.trim(), ext: v.ext.trim(), title: v.title.trim(), department: v.dept.trim(),
      role: role === 'admin' ? 'Admin' : 'Standard', perms: role === 'admin' ? {} : perms, orgKey: 'internal',
    });
    toast('Successfully invited user', 'Your new user has been created. They will receive an email requesting them to join.');
    onInvited?.(name);
    onClose();
  };

  return (
    <Shell
      titleId="inv-title" icon={<UserPlus size={20} />} title="Invite user" sub="They will receive a temporary password in their email." onClose={onClose}
      extraHead={<div className={s.steps} aria-hidden="true"><span className={`${s.step} ${s.stepOn}`} /><span className={`${s.step} ${step === 2 ? s.stepOn : ''}`} /></div>}
      footer={step === 1 ? (
        <>
          <button type="button" className="cc-btn cc-btn--secondary" onClick={onClose}>Cancel</button>
          <button type="button" className="cc-btn cc-btn--primary" onClick={onContinue}>Continue</button>
        </>
      ) : (
        <>
          <button type="button" className="cc-btn cc-btn--secondary" onClick={() => setStep(1)}>Back</button>
          <button type="button" className="cc-btn cc-btn--primary" aria-disabled={!role} onClick={onSend}>Send invitation</button>
        </>
      )}
    >
      <p className="sr-only" aria-live="polite">Step {step} of 2</p>
      {step === 1 ? (
        <>
          <h3 className={s.h3}>Details</h3>
          <div className={s.grid}>
            <div className={s.full}>
              <span className={s.label} id="inv-org-label">Organization <span aria-hidden="true" className={s.req}>*</span></span>
              <UsersOrgPicker id="op-inv" options={INVITE_ORGS.map((o) => ({ key: o.num, ...o }))} value={org} onChange={setOrg} invalid={tried && !!errs.org} />
              {tried && errs.org && <p className={s.err}>Select an organization.</p>}
            </div>
            {field('first', 'First name', 'Enter first name', true)}
            {field('last', 'Last name', 'Enter last name', true)}
            {field('email', 'Email', 'name@example.com', true, 'email')}
            <div className={s.phoneRow}>
              {field('phone', 'Phone number', '+1 (123) 456-7890', true, 'tel')}
              {field('ext', 'Extension', 'e.g. 123', false)}
            </div>
            {field('title', 'Title', 'Enter title', true)}
            {field('dept', 'Department', 'Enter department', true)}
          </div>
        </>
      ) : (
        <AccessPicker role={role} setRole={setRole} perms={perms} setPerms={setPerms} pfx="inv" />
      )}
    </Shell>
  );
}

/* ---------- Edit user access ---------- */
export function EditAccessDialog({ user, onClose }: { user: User; onClose: () => void }) {
  const toast = useToast();
  const initRole: 'admin' | 'standard' = isAdminRole(user.role) ? 'admin' : 'standard';
  const initPerms = { ...emptyPerms(), ...user.perms };
  const [role, setRole] = useState<'admin' | 'standard'>(initRole);
  const [perms, setPerms] = useState<Perms>(initPerms);
  const orig = useRef(JSON.stringify({ role: initRole, perms: initPerms }));
  const changed = JSON.stringify({ role, perms }) !== orig.current;
  const onSave = () => {
    if (!changed) return;
    patchUser(user.key, { role: role === 'admin' ? ROLES.admin[0] : 'Standard', perms: role === 'admin' ? {} : perms, updatedAt: stampNow(), updatedBy: CURRENT_USER.email });
    toast('Successfully updated access', 'The access for this user has been updated.');
    onClose();
  };
  return (
    <Shell titleId="ua-title" icon={<Shield size={20} />} title="Edit user access" sub="Settings will apply immediately." onClose={onClose}
      footer={<>
        <button type="button" className="cc-btn cc-btn--secondary" onClick={onClose}>Cancel</button>
        <button type="button" className="cc-btn cc-btn--primary" aria-disabled={!changed} onClick={onSave}>Update access</button>
      </>}>
      <AccessPicker role={role} setRole={setRole} perms={perms} setPerms={setPerms} pfx="ua" />
    </Shell>
  );
}

/* ---------- Deactivate / Reactivate ---------- */
export function UserStatusDialog({ kind, user, onClose, onDone }: { kind: 'deactivate' | 'reactivate'; user: User; onClose: () => void; onDone?: () => void }) {
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const deact = kind === 'deactivate';
  const close = () => { if (!busy) onClose(); };
  useModal(close, 'ud-title');
  const confirm = () => {
    if (busy) return;
    setBusy(true);
    window.setTimeout(() => {
      patchUser(user.key, { inactive: deact, updatedAt: stampNow(), updatedBy: CURRENT_USER.email });
      if (deact) toast('Successfully deactivated user', `${user.name} has been deactivated and removed from the platform.`);
      else toast('Successfully reactivated user', `${user.name} has been reactivated and can now access the platform.`);
      onDone?.();
      onClose();
    }, 700);
  };
  return (
    <div className="cc-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="ud-title" aria-describedby="ud-desc">
      <div className={`${s.panel} ${s.small}`}>
        <button type="button" className={`cc-icon-btn ${s.close}`} aria-label="Close" onClick={close}><X size={20} aria-hidden="true" /></button>
        <div className={s.statusRow}>
          <span aria-hidden="true" className={`${s.ringIcon} ${deact ? s.ringErr : s.ringOk}`}>{deact ? <UserX size={20} /> : <UserCheck size={20} />}</span>
          <div>
            <h2 id="ud-title" tabIndex={-1} className={s.statusTitle}>{deact ? 'Deactivate user' : 'Reactivate user'}</h2>
            <p id="ud-desc" className={s.statusBody}>
              {deact ? 'Are you sure you want to deactivate this user? They will lose access immediately.' : 'Are you sure you want to reactivate this user? They will regain access immediately.'}
            </p>
          </div>
        </div>
        <div className={s.who}>
          <span aria-hidden="true" className={s.whoAvatar}>{user.initials}</span>
          <span style={{ minWidth: 0 }}><span className={s.whoName}>{user.name}</span><span className={s.whoEmail}>{user.email}</span></span>
        </div>
        <p className={s.note}>{deact ? 'No data will be deleted. You can reactivate this user at anytime.' : 'They will receive an invite in their email to rejoin the platform.'}</p>
        <div className={s.actions}>
          <button type="button" className="cc-btn cc-btn--secondary" onClick={close}>Cancel</button>
          <button type="button" className={`cc-btn ${deact ? 'cc-btn--destructive' : 'cc-btn--primary'}`} aria-busy={busy} onClick={confirm}>
            {busy && <span className={s.spin} aria-hidden="true" />}{deact ? 'Deactivate user' : 'Reactivate user'}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Change password ---------- */
type PwKey = 'cur' | 'nw' | 'cf';
export function ChangePasswordDialog({ user, onClose }: { user: User | null; onClose: () => void }) {
  const toast = useToast();
  const self = !user || user.isMe;
  const [p, setP] = useState<Record<PwKey, string>>({ cur: '', nw: '', cf: '' });
  const [show, setShow] = useState<Partial<Record<PwKey, boolean>>>({});
  const [tried, setTried] = useState(false);
  useModal(onClose, 'pw-title');
  const nw = p.nw;
  const reqs: [string, boolean][] = [
    ['One lowercase character', /[a-z]/.test(nw)], ['One uppercase character', /[A-Z]/.test(nw)], ['One number', /\d/.test(nw)],
    ['One special character', /[^A-Za-z0-9]/.test(nw)], ['12+ characters', nw.length >= 12],
    ['Different than previous passwords', !!nw && (self ? nw !== p.cur : true)],
  ];
  const allMet = reqs.every((r) => r[1]);
  const errs: Partial<Record<PwKey, string>> = {};
  if (tried) {
    if (self && !p.cur) errs.cur = 'Enter your current password.';
    if (!allMet) errs.nw = 'Password does not meet requirements.';
    if (!p.cf) errs.cf = 'Confirm your new password.'; else if (p.cf !== nw) errs.cf = 'Passwords do not match.';
  }
  const ready = (!self || !!p.cur) && allMet && !!p.cf;
  const onSave = () => {
    if (!ready || p.cf !== nw) { setTried(true); if (ready) setTimeout(() => document.getElementById('pw-cf')?.focus(), 30); return; }
    toast('Successfully updated password', 'The password for this account has been updated.');
    onClose();
  };
  const fields: [PwKey, string, string, string][] = [];
  if (self) fields.push(['cur', 'Current Password', 'Enter your current password', 'current-password']);
  fields.push(['nw', 'New Password', 'Enter your new password', 'new-password'], ['cf', 'Confirm New Password', 'Confirm your new password', 'new-password']);

  return (
    <div className="cc-dialog-overlay" role="dialog" aria-modal="true" aria-labelledby="pw-title">
      <div className={`${s.panel} ${s.pw}`}>
        <div className={s.pwHead}>
          <span className={s.headIcon} aria-hidden="true"><Shield size={20} /></span>
          <h2 id="pw-title" tabIndex={-1} className={s.pwTitle}>Change password</h2>
          <p className={s.sub} style={{ marginTop: 'var(--space-0_5)' }}>
            {self ? 'Create a new password for your account. You will be signed out of all active sessions.' : `Create a new password for ${user!.name}. They will be signed out of all active sessions.`}
          </p>
          <button type="button" className={`cc-icon-btn ${s.close}`} aria-label="Close" onClick={onClose}><X size={20} aria-hidden="true" /></button>
        </div>
        <div className={s.pwBody}>
          {fields.map(([k, label, ph, ac]) => {
            const e = errs[k];
            const shown = !!show[k];
            return (
              <div key={k}>
                <label htmlFor={`pw-${k}`} className={s.label}>{label}</label>
                <div className={s.pwWrap}>
                  <input id={`pw-${k}`} type={shown ? 'text' : 'password'} autoComplete={ac} className="cc-input" placeholder={ph} value={p[k]}
                    aria-invalid={e ? true : undefined} aria-describedby={e ? `pw-${k}-err` : undefined}
                    onChange={(ev) => setP({ ...p, [k]: ev.target.value })} />
                  {p[k] && (
                    <button type="button" className={`cc-icon-btn cc-icon-btn--xs ${s.eye}`} aria-label={shown ? 'Hide password' : 'Show password'} aria-pressed={shown}
                      onClick={() => setShow({ ...show, [k]: !shown })}>
                      {shown ? <EyeOff size={16} aria-hidden="true" /> : <Eye size={16} aria-hidden="true" />}
                    </button>
                  )}
                </div>
                {e && <p id={`pw-${k}-err`} className={s.err}>{e}</p>}
              </div>
            );
          })}
          <ul aria-label="Password requirements" className={s.reqs}>
            {reqs.map(([label, met]) => (
              <li key={label} className={s.reqItem}>
                <span aria-hidden="true" className={`${s.reqDot} ${met ? s.reqDotMet : ''}`}><Check size={12} strokeWidth={3} /></span>
                {label}<span className="sr-only">{met ? ' (met)' : ' (not met)'}</span>
              </li>
            ))}
          </ul>
        </div>
        <div className={s.pwFoot}>
          <button type="button" className="cc-btn cc-btn--secondary cc-btn--lg" onClick={onClose}>Cancel</button>
          <button type="button" className="cc-btn cc-btn--primary cc-btn--lg" aria-disabled={!ready} onClick={onSave}>Update password</button>
        </div>
      </div>
    </div>
  );
}
