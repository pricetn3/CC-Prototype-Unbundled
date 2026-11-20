/* Org profile › Punctuation Data: the organization's punctuation rules (read-only). */

import { PUNCTUATION } from '../../data/orgProfile';
import s from './OrgTabs.module.css';

export function PunctuationTab() {
  return (
    <>
      <h2 className={`${s.h2} ${s.head}`}>Punctuation data profile</h2>
      <dl className={s.dl}>
        {PUNCTUATION.map((g, i) => (
          <div key={i} className={s.dlGroup}>
            {g.map(([label, value]) => (
              <div key={label} className={s.dlRow}>
                <dt className={s.dt}>{label}</dt>
                <dd className={s.dd}>{value}</dd>
              </div>
            ))}
          </div>
        ))}
      </dl>
    </>
  );
}
