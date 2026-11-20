/* Right-edge side panel (400px) below the 64px top bar, used for row details and edit forms.
   Esc and the close button dismiss it; focus moves to the title on open and back to the opener on close. */

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}

export function Drawer({ title, subtitle, onClose, children, footer, width = 400 }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); opener?.focus?.(); };
  }, [onClose]);

  return (
    <aside
      role="dialog"
      aria-modal="false"
      aria-labelledby="cc-drawer-title"
      style={{
        position: 'fixed', top: 64, right: 0, bottom: 0, zIndex: 40, width, maxWidth: '100%',
        display: 'flex', flexDirection: 'column', background: 'var(--bg-primary)',
        borderLeft: '1px solid var(--gray-200)', boxShadow: 'var(--shadow-drawer)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', padding: 'var(--space-5) var(--space-5) var(--space-4)', borderBottom: '1px solid var(--gray-200)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 id="cc-drawer-title" ref={titleRef} tabIndex={-1} style={{ outline: 'none', font: 'var(--fw-semibold) var(--text-lg-size)/var(--text-lg-lh) var(--font-body)', color: 'var(--gray-900)' }}>{title}</h2>
          {subtitle && <p style={{ marginTop: 'var(--space-0_5)', font: 'var(--fw-regular) var(--text-sm-size)/var(--text-sm-lh) var(--font-body)', color: 'var(--fg-secondary)' }}>{subtitle}</p>}
        </div>
        <button type="button" className="cc-icon-btn" aria-label="Close panel" onClick={onClose}><X size={20} aria-hidden="true" /></button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-5)' }}>{children}</div>
      {footer && <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)', padding: 'var(--space-4) var(--space-5)', borderTop: '1px solid var(--gray-200)' }}>{footer}</div>}
    </aside>
  );
}
