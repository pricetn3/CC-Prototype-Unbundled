/* Sample student reorders, ported from the Internal CC Platform prototype's seed data. Names are fictional. */

export type ReorderStatus = 'pending' | 'approved' | 'denied';
export type PayKey = 'created' | 'completed' | 'approved' | 'payer' | 'cancelled' | 'voided' | 'expired';

export interface Reorder {
  id: string;
  name: string;
  conferral: string;
  conferralIso: string;
  credential: string;
  major: string;
  payment: PayKey;
  payState: PayKey;
  days: number;
  init: ReorderStatus;
  expired: boolean;
  decidedAt: string;
  decidedTs: number;
  indId: string;
  reason: string;
  requestedName: string;
  product: string;
  expires: string;
  phone: string;
  dob: string;
  email: string;
  comment: string;
  shipMethod: string;
  deliveryName: string;
  country: string;
  street: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  denySeed: string;
  note: string;
}

export const PAY_META: Record<PayKey, { label: string; badge: string }> = {
  created: { label: 'Created', badge: '' },
  completed: { label: 'Completed', badge: 'cc-badge--success' },
  approved: { label: 'Approved', badge: 'cc-badge--success' },
  payer: { label: 'Payer Action Required', badge: 'cc-badge--warning' },
  cancelled: { label: 'Cancelled', badge: 'cc-badge--error' },
  voided: { label: 'Voided', badge: 'cc-badge--error' },
  expired: { label: 'Expired', badge: 'cc-badge--error' },
};

type Row = [string, string, string, string, string, PayKey, number, string?, string?];
const ROWS: Row[] = [
  ['ro1', 'Olivia Rhye', 'Jan 2026', 'Bachelors of Science', 'Mathematics', 'created', 3],
  ['ro2', 'James Smith', 'Jan 2026', 'Masters of Science', 'Sociology', 'completed', 5],
  ['ro3', 'Sophia Chen', 'Apr 2026', 'Bachelor of Science', 'Physics', 'completed', 10],
  ['ro4', 'Liam Johnson', 'May 2026', 'Doctor of Philosophy', 'Psychology', 'payer', 12],
  ['ro5', 'Ava Martinez', 'May 2026', 'Associate of Arts', 'Fine Arts', 'completed', 17],
  ['ro6', 'Noah Brown', 'May 2026', 'Masters of Engineering', 'Engineering', 'completed', 23],
  ['ro7', 'Emma Wilson', 'Aug 2026', 'Masters of Business Administration', 'Business', 'completed', 27],
  ['ro8', 'Logan Davis', 'Sep 2026', 'Bachelor of Arts', 'Fine Arts', 'completed', 29],
  ['ro9', 'Isabella Garcia', 'Oct 2026', 'Bachelors of Science', 'Biology', 'completed', 29],
  ['ro10', 'Ethan Clark', 'Oct 2026', 'Bachelor of Arts', 'History', 'completed', 30],
  ['ro11', 'Mia Lewis', 'Dec 2026', 'Masters of Science', 'Chemistry', 'created', 31],
  ['ro12', 'Lucas Walker', 'Dec 2026', 'Bachelor of Science', 'Computer Science', 'completed', 32],
  ['ro13', 'Charlotte Hall', 'Jan 2026', 'Bachelors of Science', 'Mathematics', 'completed', 0, 'approved', '10/8/2025, 12:00 PM'],
  ['ro14', 'Henry Young', 'Jan 2026', 'Masters of Science', 'Sociology', 'completed', 0, 'approved', '10/7/2025, 11:30 AM'],
  ['ro15', 'Amelia King', 'Apr 2026', 'Bachelor of Science', 'Physics', 'completed', 0, 'approved', '10/6/2025, 10:15 AM'],
  ['ro16', 'Benjamin Scott', 'May 2026', 'Doctor of Philosophy', 'Psychology', 'completed', 0, 'approved', '10/5/2025, 9:00 AM'],
  ['ro17', 'Harper Green', 'May 2026', 'Associate of Arts', 'Fine Arts', 'completed', 0, 'approved', '10/4/2025, 8:45 AM'],
  ['ro18', 'Elijah Adams', 'Aug 2026', 'Masters of Business Administration', 'Business', 'completed', 0, 'approved', '10/2/2025, 6:20 AM'],
  ['ro19', 'Evelyn Baker', 'Jan 2026', 'Bachelors of Science', 'Mathematics', 'completed', 0, 'denied', '10/8/2025, 12:00 PM'],
  ['ro20', 'Mason Nelson', 'Jan 2026', 'Masters of Science', 'Sociology', 'approved', 0, 'expired', '10/7/2025, 11:30 AM'],
  ['ro21', 'Abigail Carter', 'Apr 2026', 'Bachelor of Science', 'Physics', 'voided', 0, 'denied', '10/11/2025, 3:00 PM'],
  ['ro22', 'Jacob Mitchell', 'May 2026', 'Doctor of Philosophy', 'Psychology', 'completed', 0, 'expired', '10/5/2025, 9:00 AM'],
  ['ro23', 'Ella Perez', 'May 2026', 'Associate of Arts', 'Fine Arts', 'approved', 0, 'denied', '10/4/2025, 8:45 AM'],
  ['ro24', 'Daniel Roberts', 'Sep 2026', 'Bachelor of Arts', 'Fine Arts', 'approved', 0, 'denied', '10/1/2025, 5:10 AM'],
];

const MONTHS: Record<string, string> = { Jan: '01', Apr: '04', May: '05', Aug: '08', Sep: '09', Oct: '10', Dec: '12' };

export function seedReorders(): Reorder[] {
  const reasons = ['Lost', 'Damaged', 'Name change', 'Lost'];
  return ROWS.map((r, i) => {
    const parts = r[1].split(' ');
    const first = parts[0].toLowerCase(), last = parts[parts.length - 1].toLowerCase();
    const init0 = r[7] || 'pending';
    const expired = init0 === 'expired';
    return {
      id: r[0], name: r[1], conferral: r[2], credential: r[3], major: r[4],
      payment: expired ? 'expired' : r[5], days: r[6],
      init: (expired ? 'denied' : init0) as ReorderStatus, expired,
      decidedAt: r[8] ? r[8] + ' ET' : '', decidedTs: r[8] ? Date.parse(r[8]) || 0 : 0,
      indId: String(60450 + i), reason: reasons[i % reasons.length], requestedName: r[1], product: 'Paper Diploma Replacement ($0.00)',
      payState: expired ? 'expired' : r[5] === 'payer' ? 'payer' : r[5] === 'created' ? 'created' : 'completed',
      expires: 'Jan ' + (1 + (i % 28)) + ', 2026', phone: '(123) 456-78' + String(10 + i).slice(-2),
      dob: '0' + (1 + (i % 9)) + '/0' + (1 + (i % 8)) + '/199' + (i % 10),
      email: first + last + (13000 + i) + '@gmail.com', comment: 'This order is for myself. My name and requested name now match.',
      shipMethod: 'Domestic shipping ($10.00)', deliveryName: r[1], country: 'United States', street: 100 + i * 7 + ' Home Lane',
      apt: 'Apt. ' + (400 + i), city: 'Boston', state: 'Massachusetts', zip: '02' + (110 + i),
      conferralIso: '2026-' + (MONTHS[r[2].slice(0, 3)] || '01') + '-15',
      denySeed: init0 === 'denied' ? 'Requested name does not match the name on file.' : '',
      note: i === 2 ? 'This order should be fulfilled immediately!' : '',
    };
  });
}

export interface ActivityItem { who: string; ini: string; what: string; when: string; ago: string }

export function reorderSeedLog(r: Reorder): ActivityItem[] {
  const idx = parseInt(r.id.slice(2), 10) || 0;
  if (r.init === 'pending' && idx % 4 === 0) return [];
  const out: ActivityItem[] = [];
  if (r.init === 'approved') out.push({ who: 'Natali Craig', ini: 'NC', what: 'Approved reorder', when: r.decidedAt, ago: '1 month ago' });
  if (r.init === 'denied') out.push({ who: 'Natali Craig', ini: 'NC', what: r.expired ? 'Reorder expired' : 'Denied reorder', when: r.decidedAt, ago: '1 month ago' });
  out.push({ who: 'Natali Craig', ini: 'NC', what: 'Edited reorder information', when: 'Mar 1, 2026 at 11:01 AM ET', ago: '2 months ago' });
  out.push({ who: 'Orlando Diggs', ini: 'OD', what: 'Edited reorder information', when: 'Jan 2, 2026 at 9:41 AM ET', ago: '4 months ago' });
  return out;
}

export const REORDER_CONTACT = { email: 'dpark@organization.com' };
