/* 18px round status marks used in org lists: complete (check), pending or on hold (minus), inactive (x).
   Each carries a text label for screen readers, so status isn't color alone (WCAG 1.4.1). */

import { Check, Minus, X } from 'lucide-react';

type Kind = 'ok' | 'pending' | 'error';

const TONES: Record<Kind, { bg: string; bd: string; fg: string }> = {
  ok: { bg: 'var(--success-50)', bd: 'var(--success-200)', fg: 'var(--success-600)' },
  pending: { bg: 'var(--warning-50)', bd: 'var(--warning-200)', fg: 'var(--warning-700)' },
  error: { bg: 'var(--error-50)', bd: 'var(--error-200)', fg: 'var(--error-500)' },
};

export function StatusIcon({ kind, label }: { kind: Kind; label: string }) {
  const t = TONES[kind];
  const Icon = kind === 'ok' ? Check : kind === 'pending' ? Minus : X;
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      style={{
        width: 18, height: 18, flexShrink: 0, boxSizing: 'border-box', verticalAlign: 'middle',
        borderRadius: 'var(--radius-full)', background: t.bg, border: `1px solid ${t.bd}`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <Icon size={11} strokeWidth={2.5} color={t.fg} aria-hidden="true" />
    </span>
  );
}
