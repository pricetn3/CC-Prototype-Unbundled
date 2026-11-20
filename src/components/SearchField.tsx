/* Search input with a leading search icon and an optional clear button, built on the design system's cc-input. */

import { forwardRef, type InputHTMLAttributes } from 'react';
import { Search, X } from 'lucide-react';
import styles from './SearchField.module.css';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'size'> {
  value: string;
  onChange: (value: string) => void;
  width?: number | string;
  size?: 'md' | 'sm';
  clearable?: boolean;
}

export const SearchField = forwardRef<HTMLInputElement, Props>(function SearchField(
  { value, onChange, width, size = 'md', clearable, className, ...rest },
  ref,
) {
  return (
    <div className={`cc-input${size === 'sm' ? ' cc-input--sm' : ''} ${styles.field} ${className ?? ''}`} style={{ width }}>
      <Search size={16} className={styles.icon} aria-hidden="true" />
      <input ref={ref} className={styles.input} value={value} onChange={(e) => onChange(e.target.value)} {...rest} />
      {clearable && value && (
        <button type="button" className={styles.clear} aria-label="Clear search" onClick={() => onChange('')}>
          <X size={14} aria-hidden="true" />
        </button>
      )}
    </div>
  );
});
