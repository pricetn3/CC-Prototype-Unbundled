/* Shared table shell: sticky header, horizontal scroll past a min width, and an empty state.
   Pass <thead> and <tbody> as children. */

import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import styles from './CCTable.module.css';

interface Props {
  children: ReactNode;
  minWidth?: string;
  empty?: boolean;
  emptyIcon?: LucideIcon;
  emptyTitle?: string;
  emptyText?: string;
  /** Featured icon: the icon sits in a 48px bordered tile and the text is larger. */
  featuredIcon?: boolean;
  actionLabel?: string;
  onAction?: () => void;
  label?: string;
}

export function CCTable({
  children, minWidth = '720px', empty, emptyIcon: EmptyIcon, emptyTitle = 'No results found', emptyText,
  featuredIcon, actionLabel, onAction, label,
}: Props) {
  return (
    <div className={styles.scroll} tabIndex={0} role="region" aria-label={label}>
      <table className={styles.table} style={{ minWidth }}>
        {children}
      </table>
      {empty && (
        <div className={styles.empty}>
          {EmptyIcon && featuredIcon && (
            <span className={styles.featured} aria-hidden="true"><EmptyIcon size={24} /></span>
          )}
          {EmptyIcon && !featuredIcon && <EmptyIcon size={32} className={styles.plainIcon} aria-hidden="true" />}
          <div className={featuredIcon ? styles.titleLg : styles.title}>{emptyTitle}</div>
          {emptyText && <div className={featuredIcon ? styles.textLg : styles.text}>{emptyText}</div>}
          {actionLabel && onAction && (
            <div className={styles.action}>
              <button type="button" className="cc-btn cc-btn--secondary" onClick={onAction}>{actionLabel}</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
