import type { ReactNode } from 'react';
import styles from './PageHeader.module.css';

interface Props {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  /** Shown before the title (an avatar on Home). */
  lead?: ReactNode;
  divider?: boolean;
  children?: ReactNode;
}

/** Page title row: 24px semibold title, 16px secondary subtitle, actions on the right. */
export function PageHeader({ title, subtitle, actions, lead, divider, children }: Props) {
  return (
    <div className={`cc-scr ${styles.header} ${divider ? styles.divider : ''}`}>
      <div className={styles.row}>
        <div className={styles.titleWrap}>
          {lead}
          <div>
            <h1 className={styles.title}>{title}</h1>
            {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
          </div>
        </div>
        {actions && <div className={styles.actions}>{actions}</div>}
      </div>
      {children}
    </div>
  );
}
