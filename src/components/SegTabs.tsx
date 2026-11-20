/* Segmented tabs (design system cc-tabs). Page-level tabs use the brand look (light blue selected tab);
   pass `inset` for tabs inside a card or table toolbar (white selected tab). */

export interface SegTab<K extends string> {
  key: K;
  label: string;
  count?: number | string;
}

interface Props<K extends string> {
  tabs: SegTab<K>[];
  value: K;
  onChange: (key: K) => void;
  inset?: boolean;
  label?: string;
}

export function SegTabs<K extends string>({ tabs, value, onChange, inset, label }: Props<K>) {
  return (
    <div className={'cc-tabs' + (inset ? '' : ' cc-tabs--brand')} role="group" aria-label={label}>
      {tabs.map((t) => (
        <button key={t.key} type="button" className="cc-tabs__tab" aria-pressed={t.key === value} onClick={() => onChange(t.key)}>
          {t.label}
          {t.count !== undefined && <span className="cc-tabs__count">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}
