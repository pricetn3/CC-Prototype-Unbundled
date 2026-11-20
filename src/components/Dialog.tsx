/* Modal dialog on the design system's cc-dialog-overlay / cc-dialog. Esc and the close button dismiss it;
   focus moves to the title on open and back to the opener on close. */

import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: string;
  description?: ReactNode;
  onClose: () => void;
  children?: ReactNode;
  actions?: ReactNode;
  maxWidth?: number;
  role?: 'dialog' | 'alertdialog';
}

export function Dialog({ title, description, onClose, children, actions, maxWidth = 544, role = 'dialog' }: Props) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="cc-dialog-overlay" role={role} aria-modal="true" aria-labelledby="cc-dialog-title">
      <div className="cc-dialog" style={{ position: 'relative', maxWidth }}>
        <h2 id="cc-dialog-title" ref={titleRef} tabIndex={-1} className="cc-dialog__title" style={{ paddingRight: 'var(--space-10)', outline: 'none' }}>
          {title}
        </h2>
        {description && <p className="cc-dialog__message">{description}</p>}
        <button type="button" onClick={onClose} aria-label="Close" className="cc-icon-btn" style={{ position: 'absolute', top: 'var(--space-4)', right: 'var(--space-4)' }}>
          <X size={20} aria-hidden="true" />
        </button>
        {children}
        {actions && <div className="cc-dialog__actions">{actions}</div>}
      </div>
    </div>
  );
}
