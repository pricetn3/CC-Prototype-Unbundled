/* Reports sample data, ported from the prototype: DirectShip tracking and download rows (criteria-based detail
   reports) and monthly summaries for validations, issued vs downloaded, and student reorders. */

export const REPORT_ORGS: { num: string; name: string }[] = [
  { num: '1800', name: 'Harvard University' }, { num: '1801', name: 'Harvard Graduate School of Design' },
  { num: '1802', name: 'Harvard Business School' }, { num: '2400', name: 'Virginia Hancock University' },
];

const orgFactor = (org: string) => ({ '1800': 1, '1801': 0.5, '1802': 0.35, '2400': 0.7 } as Record<string, number>)[org] ?? 1;
const orgKeep = (org: string, i: number) => (org === '1801' ? i % 2 === 0 : org === '1802' ? i % 3 === 0 : org === '2400' ? i % 2 === 1 : true);
const emailOf = (name: string) => name.toLowerCase().replace(/[^a-z]/g, '') + '@org.com';
const dfmt = (t: number) => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export type ReportRow = Record<string, string>;

const TRACK: string[][] = [
  ['1923910231', 'SO-0839584', 'Jan 6, 2025', 'UPS Ground', 'Jessica Marie', '24671', '456 Maple Street', 'Mailroom', '', 'Los Angeles', 'CA', '90012', 'United States'],
  ['1923910231', 'SO-0839585', 'Feb 14, 2025', 'UPS Ground', 'Michael Johnson', '24672', '789 Elm Road', '', '', 'Chicago', 'IL', '60614', 'United States'],
  ['1923910232', 'SO-0839586', 'Mar 21, 2025', 'UPS 3 Day Select', 'Emily Carter', '24673', '321 Oak Lane', 'Apt 402', '', 'New York', 'NY', '10012', 'United States'],
  ['1923910233', 'SO-0839587', 'Apr 30, 2025', 'UPS 2nd Day Air', 'David Smith', '24674', '654 Pine Crescent', 'Apt 402', '', 'Miami', 'FL', '33101', 'United States'],
  ['1923910234', 'SO-0839588', 'May 15, 2025', 'UPS Next Day Air', 'Sophia Brown', '24675', '987 Birch Boulevard', 'Unit 213', '', 'Seattle', 'WA', '98101', 'United States'],
  ['1923910235', 'SO-0839589', 'Jun 22, 2025', 'USPS Priority Mail', 'James Grant', '24676', '221B Baker Street', 'Marylebone', '', 'London', '', 'NW1 6XE', 'United Kingdom'],
  ['1923910236', 'SO-0839590', 'Jul 19, 2025', 'USPS Priority Mail', 'Olivia Martinez', '24677', '246 Spruce Way', 'Suite 300', '', 'San Francisco', 'CA', '94103', 'United States'],
  ['1923910237', 'SO-0839591', 'Aug 28, 2025', 'USPS Priority Mail', 'Liam Thompson', '24678', '369 Willow Court', '', '', 'Atlanta', 'GA', '30303', 'United States'],
  ['1923910238', 'SO-0839592', 'Sep 12, 2025', 'USPS Priority Mail', 'Ava Robinson', '24679', '852 Cherry Place', 'Apt 800', '', 'Denver', 'CO', '80202', 'United States'],
  ['1923910239', 'SO-0839593', 'Oct 25, 2025', 'USPS Priority Mail', 'Ethan Davis', '24680', '147 Ash Alley', '', '', 'Phoenix', 'AZ', '85004', 'United States'],
  ['1923910240', 'SO-0839594', 'Nov 30, 2025', 'USPS Priority Mail', 'Isabella Clark', '24681', '258 Walnut Terrace', '', '', 'Austin', 'TX', '78701', 'United States'],
];
export function trackRows(org: string): ReportRow[] {
  return TRACK.filter((_, i) => orgKeep(org, i)).map((r) => {
    const ship = Date.parse(r[2]);
    return { tracking: r[0], so: r[1], ship: r[2], carrier: r[3], name: r[4], ind: r[5], email: emailOf(r[4]), a1: r[6], a2: r[7], a3: r[8], city: r[9], state: r[10], zip: r[11], country: r[12],
      order: dfmt(ship - 5 * 864e5), conf: 'Dec 15, 2024' };
  });
}

const DOWNLOADS: string[][] = [
  ['Jan 6, 2025', 'SO-0839584', 'Jan 6, 2025', 'Jan 6, 2025', 'Jan 6, 2025', 'Jessica Marie', '24671', 'Bachelor of Arts'],
  ['Feb 15, 2025', 'SO-0839585', 'Feb 15, 2025', 'Jan 2, 2025', 'Jan 2, 2025', 'Michael Johnson', '24672', 'Master of Science'],
  ['Mar 24, 2025', 'SO-0839586', 'Mar 24, 2025', 'Jan 1, 2025', 'Jan 1, 2025', 'Emily Carter', '24673', 'Bachelor of Science'],
  ['Apr 30, 2025', 'SO-0839587', 'Apr 30, 2025', 'Jan 5, 2025', 'Jan 5, 2025', 'David Smith', '24674', 'Master of Arts'],
  ['May 18, 2025', 'SO-0839588', 'May 18, 2025', 'Jan 3, 2025', 'Jan 4, 2025', 'Sophia Brown', '24675', 'Doctor of Philosophy'],
  ['Jun 25, 2025', 'SO-0839589', 'Jun 25, 2025', 'Jan 4, 2025', 'Jan 3, 2025', 'James Wilson', '24676', 'Bachelor of Arts'],
  ['Jul 12, 2025', 'SO-0839590', 'Jul 12, 2025', 'Jan 7, 2025', 'Jan 7, 2025', 'Olivia Martinez', '24677', 'Associate of Arts'],
  ['Aug 20, 2025', 'SO-0839591', 'Aug 20, 2025', 'Jan 8, 2025', 'Jan 8, 2025', 'Liam Thompson', '24678', 'Bachelor of Science'],
  ['Sep 28, 2025', 'SO-0839592', 'Sep 28, 2025', 'Jan 9, 2025', 'Jan 9, 2025', 'Ava Robinson', '24679', 'Master of Business Administration'],
  ['Oct 14, 2025', 'SO-0839593', 'Oct 14, 2025', 'Jan 10, 2025', 'Jan 10, 2025', 'Ethan Davis', '24680', 'Master of Science'],
  ['Nov 22, 2025', 'SO-0839594', 'Nov 22, 2025', 'Jan 11, 2025', 'Jan 11, 2025', 'Isabella Clark', '24681', 'Bachelor of Arts'],
];
export function downloadRows(org: string): ReportRow[] {
  return DOWNLOADS.filter((_, i) => orgKeep(org, i)).map((r) => ({
    dl: r[0], so: r[1], purchase: r[2], conf: r[3], order: r[4], name: r[5], ind: r[6], email: emailOf(r[5]), credential: r[7],
  }));
}

export const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export type SummaryKind = 'validations' | 'ivd' | 'reorders';
export type ReorderStatus = 'approved' | 'denied' | 'all';
export interface MonthRow {
  year: number; month: number; monthName: string; start: number; end: number;
  validations?: number; issued?: number; downloaded?: number; uptake?: number;
  orders?: number; gross?: number; fee?: number; net?: number;
}

const KNOWN: Record<SummaryKind, Record<string, number | [number, number]>> = {
  validations: { '2025-6': 34, '2025-7': 2, '2025-8': 9, '2025-9': 4, '2024-6': 4, '2024-7': 12, '2024-8': 29 },
  ivd: { '2025-6': [32, 12], '2025-7': [19, 13], '2025-8': [14, 14], '2025-9': [17, 15], '2024-6': [20, 16], '2024-7': [27, 17], '2024-8': [19, 18] },
  reorders: { '2025-6': [1, 34], '2025-7': [2, 60], '2025-8': [1, 30], '2025-9': [2, 12], '2024-6': [1, 20], '2024-7': [1, 15], '2024-8': [2, 0] },
};

export function monthlyRows(kind: SummaryKind, org: string, status: ReorderStatus): MonthRow[] {
  const f = orgFactor(org);
  const out: MonthRow[] = [];
  const known = KNOWN[kind];
  [2024, 2025].forEach((y) => {
    for (let m = 1; m <= 12; m++) {
      const k = `${y}-${m}`;
      const seed = (y * 7 + m * 13) % 23;
      const row: MonthRow = { year: y, month: m, monthName: MONTHS[m - 1], start: Date.UTC(y, m - 1, 1), end: Date.UTC(y, m, 0) };
      if (kind === 'validations') row.validations = Math.max(0, Math.round(((known[k] as number | undefined) ?? seed + 1) * f));
      if (kind === 'ivd') {
        const v = (known[k] as [number, number] | undefined) ?? [12 + seed, 6 + Math.round(seed * 0.7)];
        row.issued = Math.max(1, Math.round(v[0] * f));
        row.downloaded = Math.min(row.issued, Math.round(v[1] * f));
        row.uptake = row.issued ? row.downloaded / row.issued : 0;
      }
      if (kind === 'reorders') {
        const v = (known[k] as [number, number] | undefined) ?? [seed % 4, (seed % 4) * 15];
        const appr = { orders: Math.round(v[0] * f) || (v[0] ? 1 : 0), gross: Math.round(v[1] * f * 100) / 100 };
        const den = { orders: seed % 3 === 0 ? 1 : 0, gross: 0 };
        const pick = status === 'denied' ? den : status === 'all' ? { orders: appr.orders + den.orders, gross: appr.gross } : appr;
        row.orders = pick.orders;
        row.gross = pick.gross;
        row.fee = status === 'denied' ? 0 : Math.round(pick.orders * 1.95 * 100) / 100;
        row.net = Math.round((row.gross - row.fee) * 100) / 100;
      }
      out.push(row);
    }
  });
  return out;
}

export function rangeError(from: string, to: string) {
  if (!from || !to) return '';
  const a = Date.parse(from), b = Date.parse(to);
  if (isNaN(a) || isNaN(b)) return 'Enter a valid date.';
  if (b < a) return 'End date must be on or after the start date.';
  if (b - a > 731 * 864e5) return 'Choose a range of 2 years or less.';
  return '';
}

export function downloadCsv(name: string, header: string[], rows: string[][]) {
  const esc = (v: string) => (/[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v);
  const text = [header, ...rows].map((r) => r.map(esc).join(',')).join('\n');
  try {
    const url = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url; a.download = name + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  } catch { /* ignore */ }
}
