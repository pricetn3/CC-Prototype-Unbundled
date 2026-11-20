/* Sample hold records, ported from the Internal CC Platform prototype's seed data. Names are fictional. */

import type { ActivityItem } from './reorders';

export type HoldType = 'paper' | 'digital';
export type HoldStatus = 'hold' | 'released' | 'deleted';

export interface HoldRecord {
  id: string;
  name: string;
  indId: string;
  types: HoldType[];
  credential: string;
  major: string;
  conferral: string;
  ordered: string;
  init: Partial<Record<HoldType, HoldStatus>>;
  batched: Partial<Record<HoldType, boolean>>;
  diplomaName: string;
  phone: string;
  email: string;
  comment: string;
  service: string;
  street: string;
  apt: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  expSoon: boolean;
}

type Row = [string, string, string, HoldType[], string, string, string, HoldRecord['init'], HoldRecord['batched']];
const ROWS: Row[] = [
  ['h1', 'Olivia Rhye', '56859599', ['paper', 'digital'], 'Bachelor of Arts', 'English', 'Jan 6, 2025', {}, {}],
  ['h2', 'Jennifer Wilson', '56859598', ['paper'], 'Master of Arts', 'History', 'Jan 2, 2025', {}, {}],
  ['h3', 'Liam Carter', '56859600', ['digital'], 'Bachelor of Science', 'Biology', 'Jan 1, 2025', {}, {}],
  ['h4', 'Noah Brown', '56859602', ['paper', 'digital'], 'Master of Science', 'Physics', 'Jan 5, 2025', {}, {}],
  ['h5', 'Ava Davis', '56859603', ['paper', 'digital'], 'Associate of Arts', 'Fine Arts', 'Dec 31, 2024', { digital: 'released' }, { digital: true }],
  ['h6', 'Sophia Wilson', '', ['paper'], 'Doctor of Philosophy', 'Psychology', 'Dec 30, 2024', {}, {}],
  ['h7', 'Sophia Wilson', '', ['digital'], 'Doctor of Philosophy', 'Psychology', 'Jan 4, 2025', {}, {}],
  ['h8', 'Isabella Martinez', '56859606', ['paper', 'digital'], 'Master of Business Administration', 'Business', 'Jan 3, 2025', {}, {}],
  ['h9', 'Lucas Rodriguez', '56859607', ['digital'], 'Bachelor of Science', 'Computer Science', 'Dec 29, 2024', {}, {}],
  ['h10', 'Mia Thompson', '56859608', ['paper'], 'Bachelor of Arts', 'Sociology', 'Dec 28, 2024', {}, {}],
  ['h17', 'Noah Brown', '56859602', ['paper'], 'Bachelor of Science', 'Physics', 'Jan 20, 2025', {}, {}],
  ['h11', 'Ethan Clark', '56859609', ['paper', 'digital'], 'Master of Arts', 'Economics', 'Dec 20, 2024', { paper: 'released', digital: 'released' }, {}],
  ['h12', 'Emma Lewis', '56859610', ['paper', 'digital'], 'Bachelor of Science', 'Chemistry', 'Dec 18, 2024', { paper: 'released', digital: 'released' }, { paper: true, digital: true }],
  ['h13', 'James Walker', '56859611', ['paper'], 'Doctor of Philosophy', 'Education', 'Dec 16, 2024', { paper: 'released' }, { paper: true }],
  ['h14', 'Charlotte Hall', '56859612', ['digital'], 'Associate of Arts', 'Communications', 'Dec 15, 2024', { digital: 'released' }, {}],
  ['h15', 'Benjamin Young', '56859613', ['paper', 'digital'], 'Bachelor of Arts', 'Philosophy', 'Dec 12, 2024', { paper: 'deleted', digital: 'deleted' }, {}],
  ['h16', 'Amelia King', '56859614', ['paper'], 'Master of Science', 'Nursing', 'Dec 10, 2024', { paper: 'deleted' }, {}],
];

const EXP_SOON = ['h2', 'h3', 'h5', 'h6', 'h7', 'h9', 'h10', 'h17'];

export function seedHolds(): HoldRecord[] {
  const services = ['Standard', '5 Day', '3 Day', '1 Day'];
  return ROWS.map((r, i) => {
    const parts = r[1].split(' ');
    const first = parts[0].toLowerCase(), last = parts[parts.length - 1].toLowerCase();
    return {
      id: r[0], name: r[1], indId: r[2], types: r[3], credential: r[4], major: r[5], conferral: r[6], ordered: r[6], init: r[7], batched: r[8],
      diplomaName: r[1], phone: '(123) 456-78' + String(10 + i).slice(-2), email: first + last + String(i + 1).padStart(3, '0') + '@organization.com',
      comment: 'This order is for myself. My name and requested name now match.', service: services[i % 4],
      street: 100 + i * 7 + ' Home Lane', apt: 'Apt. ' + (400 + i), city: 'Boston', state: 'Massachusetts', zip: '839' + String(20 + i), country: 'United States',
      expSoon: EXP_SOON.includes(r[0]),
    };
  });
}

export function holdSeedLog(r: HoldRecord): ActivityItem[] {
  const out: ActivityItem[] = [];
  if (r.types.some((t) => r.init[t] === 'released')) out.push({ who: 'Natali Craig', ini: 'NC', what: 'Released hold', when: 'May 11, 2026 at 9:41 AM ET', ago: '2 days ago' });
  if (r.types.some((t) => r.init[t] === 'deleted')) out.push({ who: 'Natali Craig', ini: 'NC', what: 'Deleted records', when: 'May 9, 2026 at 3:12 PM ET', ago: '4 days ago' });
  out.push({ who: 'Natali Craig', ini: 'NC', what: 'Edited record information', when: 'Mar 3, 2026 at 10:34 AM ET', ago: '2 months ago' });
  out.push({ who: 'Orlando Diggs', ini: 'OD', what: 'Placed on hold', when: 'Jan 2, 2026 at 9:41 AM ET', ago: '4 months ago' });
  return out;
}

/** Weekly "Expiring record reports" generated for the default organization. */
export const EXPIRING_EXPORTS: [string, string][] = [
  ['May 4', '05/04/2026'], ['Apr 27', '04/27/2026'], ['Apr 20', '04/20/2026'], ['Apr 13', '04/13/2026'],
  ['Apr 6', '04/06/2026'], ['Mar 30', '03/30/2026'], ['Mar 23', '03/23/2026'], ['Mar 16', '03/16/2026'],
];

export const SERVICE_TYPES: [string, string, string][] = [
  ['standard', 'Standard', 'Small-order fee may apply for orders with under 5 credentials'],
  ['5', '5-day', '$19.95 + $2.80 per document/as contracted'],
  ['3', '3-day', '$19.95 + $2.80 per document/as contracted'],
  ['1', '1-day', '$19.95 + $2.80 per document/as contracted'],
];
