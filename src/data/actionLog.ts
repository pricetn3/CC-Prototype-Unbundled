/* Admin › Action log: changes saved in Admin › Countries and on each organization's Settings tab.
   Seed entries are ported from the Internal CC Platform prototype. */

export type LogArea = 'Organization Setup' | 'Paper Ordering' | 'Order Batching' | 'Global Settings';

export interface LogEntry {
  id: string;
  /** "MM/DD/YYYY h:mm:ss AM" */
  at: string;
  user: string;
  orgNum: string;
  orgName: string;
  type: string;
  area: LogArea;
  field: string;
  prev: string;
  next: string;
}

export const LOG_AREAS: LogArea[] = ['Organization Setup', 'Paper Ordering', 'Order Batching', 'Global Settings'];

export const LOG_TYPES = [
  'Digital credentials', 'Reorder Management', 'Display name', 'Paper ordering', 'Paper product pricing',
  'Cert types', 'Lost & Damaged', 'API order batching', 'Hold Management', 'Countries',
];

const AREA: Record<string, LogArea> = {
  'Digital credentials': 'Organization Setup',
  'Reorder Management': 'Organization Setup',
  'Display name': 'Organization Setup',
  'Paper ordering': 'Paper Ordering',
  'Paper product pricing': 'Paper Ordering',
  'Cert types': 'Paper Ordering',
  'Lost & Damaged': 'Paper Ordering',
  'API order batching': 'Order Batching',
  'Hold Management': 'Order Batching',
  Countries: 'Global Settings',
};

let seq = 0;
export function logEntry(at: string, user: string, orgNum: string, orgName: string, type: string, field: string, prev: string, next: string): LogEntry {
  return { id: 'log-' + ++seq, at, user, orgNum, orgName, type, area: AREA[type] ?? 'Organization Setup', field, prev, next };
}

const longOld = 'Bachelor of Science diploma, 14 x 11 in, printed on 80 lb cotton parchment with the university seal embossed in gold foil, signed by the President and the Dean of the College, and shipped flat in a protective diploma folio.';
const longNew = 'Bachelor of Science diploma, 14 x 11 in, printed on 80 lb cotton parchment with the university seal embossed in gold foil, signed by the President, the Provost and the Dean of the College, rolled and shipped in a crush-resistant diploma tube with a protective sleeve. Include the Latin honors line when it applies.';
const certOld = 'Certificate of completion, 11 x 8.5 in, matte cover stock, single signature.';
const certNew = 'Certificate of completion, 11 x 8.5 in, linen cover stock with raised ink seal, two signatures (Program Director and Registrar), shipped in a rigid mailer with a cardboard stiffener so it arrives flat.';

const L = logEntry;
export const seedLog = (): LogEntry[] => [
  L('11/07/2026 9:18:14 AM', 'Mia Thompson', '1419', 'Albany Medical College', 'Display name', 'Display name', 'Albany Med', 'Albany Medical College'),
  L('11/07/2026 9:05:52 AM', 'James Adams', '1422', 'Auburn University', 'Reorder Management', 'Logos', '', '1422-reorder-logo-1.png'),
  L('11/07/2026 9:05:37 AM', 'James Adams', '1422', 'Auburn University', 'Reorder Management', 'Domain', '', 'auburn.edu'),
  L('11/06/2026 4:02:08 PM', 'Elijah White', '1423', 'Baldwin-Wallace University', 'Paper ordering', 'Paper credential ordering', 'Off', 'On'),
  L('11/06/2026 3:12:41 PM', 'Sarah Jones', '2052', 'Virginia Hanock University', 'API order batching', 'Batch frequency', 'Weekly on Tuesday', 'Twice a week on Monday, Thursday'),
  L('11/06/2026 11:48:26 AM', 'Noah Patel', '2052', 'Virginia Hanock University', 'Cert types', 'Cert type description: 8511-LONGFORM-2SIG', longOld, longNew),
  L('11/06/2026 11:48:03 AM', 'Noah Patel', '2052', 'Virginia Hanock University', 'Cert types', 'Cert type packaging: 8511-LONGFORM-2SIG', '#6 Mailer (18×13×1 in)', 'Large Tube (18×3×3 in)'),
  L('11/05/2026 4:20:49 PM', 'Ava Lee', '1450', 'American International College', 'Cert types', 'Cert type description: 8511-CLIMB', certOld, certNew),
  L('11/05/2026 10:41:33 AM', 'Noah Patel', '2052', 'Virginia Hanock University', 'Paper product pricing', 'Additional paper product price', '$20.00', '$25.00'),
  L('11/05/2026 10:41:17 AM', 'Noah Patel', '2052', 'Virginia Hanock University', 'Paper product pricing', 'First paper product price', '$45.00', '$50.00'),
  L('11/04/2026 9:02:58 AM', 'James Adams', '', '', 'Countries', 'Shipping: Russia (RU)', 'Enabled', 'Disabled'),
  L('11/04/2026 9:02:22 AM', 'James Adams', '', '', 'Countries', 'Shipping: Belarus (BY)', 'Enabled', 'Disabled'),
  L('11/03/2026 4:27:45 PM', 'Mia Thompson', '1419', 'Albany Medical College', 'Hold Management', 'Email', 'registrar@amc.edu', 'diplomas@amc.edu'),
  L('11/03/2026 4:27:06 PM', 'Mia Thompson', '1419', 'Albany Medical College', 'Hold Management', 'Batch frequency', 'Monthly on day 1', 'Weekly on Friday'),
  L('10/30/2026 1:15:11 PM', 'Ava Lee', '2052', 'Virginia Hanock University', 'Digital credentials', 'Student sign-in', 'SSO', 'Email'),
  L('10/28/2026 11:05:29 AM', 'Sarah Jones', '1450', 'American International College', 'Lost & Damaged', 'Student reporting', 'Off', 'On'),
  L('10/27/2026 2:38:38 PM', 'Ava Lee', '1450', 'American International College', 'Digital credentials', 'Purchase option', '', 'Student purchase'),
];

/** A value this long opens in a dialog instead of showing in the cell. */
export const isLongValue = (e: LogEntry) => e.prev.length > 60 || e.next.length > 60;

/** "11/07/2026 9:18:14 AM" → ms timestamp */
export function logTime(at: string): number {
  const d = new Date(at.replace(/(\d+:\d+)(:\d+)? (AM|PM)/, '$1$2 $3'));
  return isNaN(d.getTime()) ? 0 : d.getTime();
}

/** "11/07/2026 9:18:14 AM" → "2026-11-07" */
export function logISODate(at: string): string {
  const m = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(at);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : '';
}

/** Now as "MM/DD/YYYY h:mm:ss AM". */
export function stampNow(d = new Date()): string {
  const p = (n: number) => String(n).padStart(2, '0');
  const h = d.getHours() % 12 || 12;
  return `${p(d.getMonth() + 1)}/${p(d.getDate())}/${d.getFullYear()} ${h}:${p(d.getMinutes())}:${p(d.getSeconds())} ${d.getHours() < 12 ? 'AM' : 'PM'}`;
}
