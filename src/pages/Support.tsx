/* Support: frequently asked questions with Privacy Policy and Terms & Conditions tabs. Documents › Helpful
   "View FAQ's" shows the same content with a back link; the avatar menu's Support opens it at /support. */

import { useState } from 'react';
import { ArrowLeft, MinusCircle, PlusCircle } from 'lucide-react';
import { SegTabs } from '../components/SegTabs';
import { useToast } from '../components/Toast';
import { FAQ } from '../data/documents';
import styles from './Documents.module.css';

type FaqTab = 'faq' | 'privacy' | 'terms';

export function SupportFaq({ onBack }: { onBack?: () => void }) {
  const toast = useToast();
  const [tab, setTab] = useState<FaqTab>('faq');
  const [cat, setCat] = useState(0);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const getInTouch = () => toast('Contact Client Relations', 'Your Client Relations contact will follow up by email.');

  return (
    <div className={`cc-scr ${styles.faqPage}`}>
      {onBack && (
        <button type="button" className={`cc-link cc-link--muted ${styles.back}`} onClick={onBack}><ArrowLeft size={16} aria-hidden="true" />Back to documents</button>
      )}
      <div className={styles.faqHead}>
        <h1 className={styles.title}>Frequently asked questions</h1>
        <p className={styles.subtitle}>
          Don't see the answer you're looking for? Please reach out to the{' '}
          <button type="button" className="cc-link" onClick={getInTouch}>Client Relations Team</button>.
        </p>
        <div style={{ marginTop: 'var(--space-5)' }}>
          <SegTabs label="Support content" value={tab} onChange={setTab} tabs={[{ key: 'faq', label: 'FAQ’s' }, { key: 'privacy', label: 'Privacy Policy' }, { key: 'terms', label: 'Terms & Conditions' }]} />
        </div>
      </div>

      {tab === 'faq' ? (
        <div className={styles.faqBody}>
          <nav aria-label="FAQ categories" className={styles.faqNav}>
            {FAQ.map(([name], ci) => (
              <button key={name} type="button" className={styles.faqNavItem} aria-current={ci === cat ? 'true' : undefined}
                onClick={() => { setCat(ci); document.getElementById(`ds-faq-${ci}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); }}>
                {name}
              </button>
            ))}
          </nav>
          <div className={styles.faqList}>
            {FAQ.map(([name, qs], ci) => (
              <section key={name} id={`ds-faq-${ci}`} aria-label={name} className={styles.faqCard}>
                <h2 className={styles.faqCat}>{name} <span className={styles.faqCount}>{qs.length}</span></h2>
                {qs.map(([q, a], qi) => {
                  const k = `${ci}-${qi}`; const o = !!open[k];
                  return (
                    <div key={k} className={styles.faqItem} data-open={o}>
                      <button type="button" className={styles.faqQ} aria-expanded={o} onClick={() => { setOpen((m) => ({ ...m, [k]: !o })); setCat(ci); }}>
                        {q}
                        {o ? <MinusCircle size={20} aria-hidden="true" /> : <PlusCircle size={20} aria-hidden="true" />}
                      </button>
                      {o && <p className={styles.faqA}>{a}</p>}
                    </div>
                  );
                })}
              </section>
            ))}
            <div className={styles.faqCta}>
              <h2 className={styles.faqCat} style={{ padding: 0 }}>Still have questions?</h2>
              <p className={styles.subtitleSm}>Can't find the answer you're looking for? Please chat with our helpful client relations team for immediate support.</p>
              <button type="button" className="cc-btn cc-btn--primary" style={{ marginTop: 'var(--space-4)' }} onClick={getInTouch}>Get in touch</button>
            </div>
          </div>
        </div>
      ) : (
        <div className={styles.policy}>
          <h2 className={styles.sectionTitle}>{tab === 'privacy' ? 'Privacy Policy' : 'Terms & Conditions'}</h2>
          <p className={styles.subtitleSm}>{tab === 'privacy' ? 'Paradigm’s privacy policy' : 'The terms and conditions for Credential Connections'} will appear here. Until then, contact the Client Relations Team for the current version.</p>
        </div>
      )}
    </div>
  );
}

export function Support() {
  return <SupportFaq />;
}
