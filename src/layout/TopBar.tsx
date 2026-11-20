/* Sticky 64px top bar: Paradigm logo and the avatar menu. */

import { useCallback, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { GraduationCap, LogOut, MessageCircleQuestion, User } from 'lucide-react';
import { CURRENT_USER } from '../data/store';
import { useDismiss } from '../components/useDismiss';
import paradigmLogo from '../assets/paradigm-logo.png';
import styles from './TopBar.module.css';

export function TopBar() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, wrap, close, btn);
  const go = (to: string) => { setOpen(false); navigate(to); };

  return (
    <header className={styles.bar}>
      <img src={paradigmLogo} alt="Paradigm" className={styles.logo} />
      <div className={styles.avatarWrap} ref={wrap}>
        <button
          ref={btn}
          type="button"
          className={styles.avatar}
          data-open={open}
          aria-label={`Account menu for ${CURRENT_USER.name}`}
          aria-haspopup="true"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
        >
          {CURRENT_USER.initials}
        </button>
        {open && (
          <div className={styles.menu}>
            <div className={styles.who}>
              <span className={styles.avatarSm} aria-hidden="true">{CURRENT_USER.initials}</span>
              <div className={styles.whoText}>
                <div className={styles.name}>{CURRENT_USER.name}</div>
                <div className={styles.email}>{CURRENT_USER.email}</div>
              </div>
            </div>
            <div className={styles.group}>
              <button type="button" className={styles.item} onClick={() => go('/profile')}><User size={18} aria-hidden="true" />View profile</button>
              <button type="button" className={styles.item} onClick={() => go('/organizations')}><GraduationCap size={18} aria-hidden="true" />Organizations</button>
            </div>
            <div className={styles.group}>
              <button type="button" className={styles.item} onClick={() => go('/support')}><MessageCircleQuestion size={18} aria-hidden="true" />Support</button>
            </div>
            <div className={styles.group}>
              <button type="button" className={`${styles.item} ${styles.logout}`} onClick={() => go('/login')}><LogOut size={18} aria-hidden="true" />Log out</button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
