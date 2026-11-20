/* My profile (/profile) and another user's profile (/users/:userId): personal information with inline editing,
   access, change password and deactivate / reactivate. ?edit=1 opens the form in edit mode. */

import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, Copy, Users as UsersIcon } from 'lucide-react';
import { useStore } from '../data/store';
import { ME_PROFILE, buildUsers, isAdminRole, orgOptions, patchUser, stampNow, useUsersState, type User } from '../data/users';
import { useToast } from '../components/Toast';
import { ChangePasswordDialog, EditAccessDialog, UserStatusDialog } from '../components/UsersDialogs';
import styles from './Profile.module.css';

type EditKey = 'first' | 'last' | 'title' | 'department' | 'email' | 'phone' | 'ext';
type Draft = Record<EditKey, string>;
const ORDER: EditKey[] = ['first', 'last', 'title', 'department', 'email', 'phone'];

function validate(v: Draft) {
  const e: Partial<Record<EditKey, string>> = {};
  if (!v.first.trim()) e.first = 'Please enter a valid first name.';
  if (!v.last.trim()) e.last = 'Please enter a valid last name.';
  if (!v.title.trim()) e.title = 'Please enter a valid title.';
  if (!v.department.trim()) e.department = 'Please enter a valid department.';
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v.email.trim())) e.email = 'Please enter a valid email address.';
  if (v.phone.replace(/\D/g, '').length < 10) e.phone = 'Please enter a valid phone number.';
  return e;
}

export function Profile() {
  const { userId } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { orgs } = useStore();
  const ustate = useUsersState();
  const opts = useMemo(() => orgOptions(orgs), [orgs]);

  const user: User | undefined = useMemo(() => {
    const key = userId ? decodeURIComponent(userId) : `internal:${ME_PROFILE.handle}`;
    const org = opts.find((o) => o.key === key.split(':')[0]);
    return org ? buildUsers(org, ustate).find((u) => u.key === key) : undefined;
  }, [userId, opts, ustate]);

  const [draft, setDraft] = useState<Draft | null>(null);
  const [tried, setTried] = useState(false);
  const [dlg, setDlg] = useState<null | 'deactivate' | 'reactivate' | 'access' | 'password'>(null);
  const [loginStamp] = useState(stampNow);

  const startEdit = (u: User) => {
    setDraft({ first: u.first, last: u.last, title: u.title, department: u.department, email: u.email, phone: u.phone, ext: u.ext });
    setTried(false);
    setTimeout(() => document.getElementById('pf-in-first')?.focus(), 30);
  };
  // /users/:id?edit=1 (from the Users row menu) opens straight into edit mode.
  useEffect(() => {
    if (params.get('edit') === '1' && user && !user.inactive) {
      startEdit(user);
      setParams({}, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params, user]);
  useEffect(() => { setDraft(null); }, [userId]);

  if (!user) {
    return <p className={styles.missing}>This user could not be found. <button type="button" className="cc-link cc-link-btn" onClick={() => navigate('/users')}>Back to Users</button></p>;
  }

  const mine = user.isMe;
  const inactive = user.inactive;
  const errs = draft ? validate(draft) : {};
  const errOf = (k: EditKey) => (tried ? errs[k] : undefined);
  const copy = (text: string) => {
    try { void navigator.clipboard?.writeText(text); } catch { /* ignore */ }
    toast('Copied to clipboard', text);
  };
  const roleCls = isAdminRole(user.role) ? styles.roleAdmin : styles.roleStd;
  const lastLogin = user.pending ? 'Invite pending' : mine ? loginStamp : user.lastLogin || '—';

  const save = () => {
    if (!draft) return;
    const first = ORDER.find((k) => errs[k]);
    if (first) { setTried(true); setTimeout(() => document.getElementById(`pf-in-${first}`)?.focus(), 30); return; }
    const t = (x: string) => x.trim();
    patchUser(user.key, { first: t(draft.first), last: t(draft.last), title: t(draft.title), department: t(draft.department), email: t(draft.email), phone: t(draft.phone), ext: t(draft.ext), updatedAt: stampNow(), updatedBy: ME_PROFILE.email });
    setDraft(null);
    toast('Successfully updated profile', 'Your changes have been saved.');
    setTimeout(() => document.getElementById('pf-title')?.focus(), 30);
  };

  const input = (k: EditKey, label: string, ph: string, type = 'text', labelled = false) => {
    const e = errOf(k);
    return (
      <>
        <input id={`pf-in-${k}`} type={type} className="cc-input" placeholder={ph} value={draft![k]}
          aria-label={labelled ? label : undefined} aria-required={k !== 'ext' || undefined}
          aria-invalid={e ? true : undefined} aria-describedby={e ? `pf-in-${k}-err` : undefined}
          onChange={(ev) => setDraft({ ...draft!, [k]: ev.target.value })} />
        {e && <p id={`pf-in-${k}-err`} className={styles.err}>{e}</p>}
      </>
    );
  };
  const reqMark = <> <span aria-hidden="true" className={styles.req}>*</span></>;

  return (
    <div key={user.key}>
      <div className={`cc-scr ${styles.crumbs}`}>
        <nav aria-label="Breadcrumb" className={styles.crumbNav}>
          <button type="button" className="cc-icon-btn" aria-label="Back to Users" title="Users" onClick={() => navigate('/users')}><UsersIcon size={20} aria-hidden="true" /></button>
          <ChevronRight size={16} color="var(--gray-500)" aria-hidden="true" />
          <span className={styles.crumbCurrent} aria-current="page">{mine ? 'My Profile' : 'User Profile'}</span>
        </nav>
        {inactive && <span className={styles.inactivePill}><span className={styles.dot} aria-hidden="true" />Inactive</span>}
      </div>

      <div className={`cc-scr ${styles.header}`}>
        <span className={styles.avatar} aria-hidden="true">{user.initials}</span>
        <div style={{ minWidth: 0 }}>
          <div className={styles.nameRow}>
            <h1 id="pf-title" tabIndex={-1} className={`${styles.name} ${inactive ? styles.dim : ''}`}>{user.name}</h1>
            {!inactive && <span className={`cc-badge cc-badge--square ${roleCls}`}>{user.role}</span>}
          </div>
          {inactive
            ? <div className={styles.subRow}>{user.email}</div>
            : <div className={styles.subRow}><span>{user.title}</span><span className={styles.sep} aria-hidden="true" /><span>{user.department}</span></div>}
        </div>
      </div>

      <div className={`cc-scr ${styles.split}`}>
        <div>
          <div className={styles.secHead}>
            <div>
              <h2 className={styles.secTitle}>Personal information</h2>
              <div className={styles.secDesc}>Update personal details and contact information.</div>
            </div>
            {draft ? (
              <div className={styles.secBtns}>
                <button type="button" className="cc-btn cc-btn--secondary" onClick={() => setDraft(null)}>Cancel</button>
                <button type="button" className="cc-btn cc-btn--primary" onClick={save}>Save changes</button>
              </div>
            ) : (
              <button type="button" className="cc-btn cc-btn--primary" aria-disabled={inactive || undefined} onClick={() => { if (!inactive) startEdit(user); }}>Edit</button>
            )}
          </div>
          <div className={styles.rule} />

          {!draft ? (
            <dl className={styles.dl}>
              <div className={styles.row}><dt className={styles.lbl}>Name</dt><dd className={`${styles.val} ${inactive ? styles.dim : ''}`}>{user.name}</dd></div>
              <div className={styles.row}><dt className={styles.lbl}>Title</dt><dd className={`${styles.val} ${inactive ? styles.dim : ''}`}>{user.title}</dd></div>
              <div className={styles.row}><dt className={styles.lbl}>Department</dt><dd className={`${styles.val} ${inactive ? styles.dim : ''}`}>{user.department}</dd></div>
              <div className={styles.row}>
                <dt className={styles.lbl}>Email</dt>
                <dd className={`${styles.val} ${styles.valFlex}`}>
                  <a className={styles.link} href={`mailto:${user.email}`}>{user.email}</a>
                  <button type="button" className="cc-icon-btn cc-icon-btn--xs" title="Copy" aria-label="Copy email address" onClick={() => copy(user.email)}><Copy size={16} aria-hidden="true" /></button>
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.lbl}>Phone</dt>
                <dd className={`${styles.val} ${styles.valFlex}`}>
                  <a className={styles.link} href={`tel:${user.phone.replace(/[^0-9+]/g, '')}`}>{user.phone}</a>
                  {user.ext && <span className={styles.ext}>ext. {user.ext}</span>}
                  <button type="button" className="cc-icon-btn cc-icon-btn--xs" title="Copy" aria-label="Copy phone number" onClick={() => copy(user.phone + (user.ext ? ' ext. ' + user.ext : ''))}><Copy size={16} aria-hidden="true" /></button>
                </dd>
              </div>
              <div className={styles.row}>
                <dt className={styles.lbl}>Access</dt>
                <dd className={`${styles.val} ${styles.accessVal}`}>
                  <span className={`cc-badge cc-badge--square ${roleCls}`}>{user.role}</span>
                  {!mine && !inactive && !user.pending && <button type="button" className="cc-link cc-link-btn" onClick={() => setDlg('access')}>Edit access</button>}
                </dd>
              </div>
            </dl>
          ) : (
            <div>
              <div className={`${styles.row} ${styles.rowTop}`}>
                <span className={`${styles.lbl} ${styles.lblPad}`} id="pf-l-name">Name{reqMark}</span>
                <div className={styles.two} role="group" aria-labelledby="pf-l-name">
                  <div>{input('first', 'First name', 'First name', 'text', true)}</div>
                  <div>{input('last', 'Last name', 'Last name', 'text', true)}</div>
                </div>
              </div>
              {([['title', 'Title', 'Title', 'text'], ['department', 'Department', 'Department', 'text'], ['email', 'Email', 'name@example.com', 'email']] as const).map(([k, label, ph, type]) => (
                <div key={k} className={`${styles.row} ${styles.rowTop}`}>
                  <label htmlFor={`pf-in-${k}`} className={`${styles.lbl} ${styles.lblPad}`}>{label}{reqMark}</label>
                  <div className={styles.field}>{input(k, label, ph, type)}</div>
                </div>
              ))}
              <div className={`${styles.row} ${styles.rowTop}`}>
                <label htmlFor="pf-in-phone" className={`${styles.lbl} ${styles.lblPad}`}>Phone{reqMark}</label>
                <div className={styles.phone}>
                  <div>{input('phone', 'Phone', '+1 (555) 000-0000', 'tel')}</div>
                  <div>{input('ext', 'Extension', 'Ext.', 'text', true)}</div>
                </div>
              </div>
              <div className={styles.row}>
                <span className={styles.lbl}>Access</span>
                <span className={styles.accessVal}>
                  <span className={`cc-badge cc-badge--square ${roleCls}`}>{user.role}</span>
                  {!mine && !user.pending && <button type="button" className="cc-link cc-link-btn" onClick={() => setDlg('access')}>Edit access</button>}
                </span>
              </div>
            </div>
          )}
        </div>

        <aside className={styles.side} aria-label="Account">
          <div><div className={styles.metaLabel}>Last updated</div><div className={styles.metaVal}>{user.updatedAt || '—'}</div></div>
          <div><div className={styles.metaLabel}>Updated by</div><div className={styles.metaVal}>{user.updatedBy || '—'}</div></div>
          <div><div className={styles.metaLabel}>Last login</div><div className={styles.metaVal}>{lastLogin}</div></div>
          <div className={styles.sideBtns}>
            {!inactive && <button type="button" className="cc-btn cc-btn--secondary" style={{ width: '100%' }} onClick={() => setDlg('password')}>Change password</button>}
            {!mine && !inactive && <button type="button" className={`cc-btn ${styles.dangerOutline}`} onClick={() => setDlg('deactivate')}>Deactivate account</button>}
            {!mine && inactive && <button type="button" className="cc-btn cc-btn--primary" style={{ width: '100%' }} onClick={() => setDlg('reactivate')}>Reactivate account</button>}
          </div>
        </aside>
      </div>

      {(dlg === 'deactivate' || dlg === 'reactivate') && <UserStatusDialog kind={dlg} user={user} onClose={() => setDlg(null)} onDone={() => setDraft(null)} />}
      {dlg === 'access' && <EditAccessDialog user={user} onClose={() => setDlg(null)} />}
      {dlg === 'password' && <ChangePasswordDialog user={user} onClose={() => setDlg(null)} />}
    </div>
  );
}
