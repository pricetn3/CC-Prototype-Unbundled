/* Placeholder for screens that are in the side nav but not rebuilt from the prototype yet. */

import { Construction } from 'lucide-react';
import { PageHeader } from '../components/PageHeader';

export function NotBuilt({ title, text = 'This screen is in the prototype but hasn’t been built in this app yet.' }: { title: string; text?: string }) {
  return (
    <>
      <PageHeader title={title} />
      <div className="cc-scr" style={{ padding: '0 var(--space-8) var(--space-8)' }}>
        <div style={{ border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-xl)', boxShadow: 'var(--shadow-xs)', padding: 'var(--space-12) var(--space-6)', textAlign: 'center' }}>
          <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 48, height: 48, border: '1px solid var(--gray-200)', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-xs)', color: 'var(--gray-700)' }}>
            <Construction size={24} />
          </span>
          <h2 style={{ marginTop: 'var(--space-4)', font: 'var(--fw-semibold) var(--text-md-size)/var(--text-md-lh) var(--font-body)', color: 'var(--gray-900)' }}>Not built yet</h2>
          <p style={{ maxWidth: 360, margin: 'var(--space-1) auto 0', font: 'var(--fw-regular) var(--text-sm-size)/var(--text-sm-lh) var(--font-body)', color: 'var(--gray-600)' }}>{text}</p>
        </div>
      </div>
    </>
  );
}
