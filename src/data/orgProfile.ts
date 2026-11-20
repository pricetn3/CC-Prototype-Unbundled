/* Org profile tab sample data (Shipping, Billing, Contacts, Punctuation Data, Settings) and the
   Add organization NAV list, ported from the Internal CC Platform prototype's seed data. */

import type { Org } from './orgs';

const domainOf = (o: Org) => (o.email.includes('@') ? o.email.split('@')[1] : 'organization.com');

/* ---------- Shipping ---------- */

export type ShipTab = 'credentials' | 'covers' | 'returns';

export interface ShipAddress {
  idx: number;
  name: string;
  line1: string;
  line2: string;
  cityLine: string;
  contact: string;
  email: string;
  archived: boolean;
  days: string;
  hours: string;
  instructions: string;
  phone: string;
  docNo: string;
}

type ShipRow = [string, string, string, string, string, boolean, string?, string?, string?, string?];

const CREDS: ShipRow[] = [
  ['Main Campus Building', '5808 University Way', 'Academic Advising Building', 'Boston, Massachusetts, 83920, United States', 'Shirley Gomez', false],
  ['Admin Office', '5678 Maple Avenue', 'Main Office 2nd Floor', 'Boston, Massachusetts, 83920, United States', 'Linda Smith', false],
  ["Registrar's Office", '1234 Elm Street', '', 'Boston, Massachusetts, 83920, United States', 'Michael Johnson', false],
  ['Admissions Department', '5678 Maple Avenue', '', 'Boston, Massachusetts, 83921, United States', 'Sarah Williams', false],
  ['Financial Aid Office', '9102 Oak Street', '', 'Boston, Massachusetts, 83922, United States', 'David Smith', false],
  ['Student Services', '3456 Pine Road', '', 'Boston, Massachusetts, 83923, United States', 'Emily Davis', false],
  ['Library Services', '7890 Elm Street', '', 'Cambridge, Massachusetts, 02139, United States', 'John Smith', false],
  ['Career Development', '456 Maple Avenue', '', 'Somerville, Massachusetts, 02143, United States', 'Sarah Johnson', false],
  ['Old Annex Mailroom', '22 Garden Street', '', 'Cambridge, Massachusetts, 02138, United States', 'Peter Nolan', true],
];
const COVERS: ShipRow[] = [
  ['Print Services', '18 Holyoke Street', 'Bindery dock B', 'Cambridge, Massachusetts, 02138, United States', 'Grace Okafor', false, 'MWF', '7:00 am – 3:00 pm', 'Covers must be delivered to bindery dock B', '+1 (617) 495-0182'],
  ['Commencement Office', '1350 Massachusetts Avenue', '', 'Cambridge, Massachusetts, 02138, United States', 'Noah Patel', false, 'Weekdays', '9:00 am – 5:00 pm', 'Covers go to the events office loading bay', '+1 (617) 495-0244'],
  ['Central Receiving', '46 Blackstone Street', 'Loading dock 3', 'Boston, Massachusetts, 83920, United States', 'Mia Thompson', false, 'Mon, Tue', '8:00 am – 4:00 pm', 'A receiving dock is needed', '+1 (617) 495-0311'],
  ['Alumni Relations', '124 Mount Auburn Street', '', 'Cambridge, Massachusetts, 02138, United States', 'Priya Nair', true, 'Weekdays', '10:00 am – 4:00 pm', 'Call ahead before delivering covers', '+1 (617) 495-0490'],
];
const RETURNS: ShipRow[] = [
  ['Returns Processing', '46 Blackstone Street', 'Loading dock 1', 'Boston, Massachusetts, 83920, United States', 'Tessa Kim', false],
  ["Registrar's Office", '1234 Elm Street', '', 'Boston, Massachusetts, 83920, United States', 'Michael Johnson', false],
  ['Old Annex Mailroom', '22 Garden Street', '', 'Cambridge, Massachusetts, 02138, United States', 'Peter Nolan', true],
];

export function shipAddresses(o: Org, tab: ShipTab): ShipAddress[] {
  const dom = domainOf(o);
  const mail = (n: string) => n.toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).slice(0, 2).join('.') + '@' + dom;
  const src = tab === 'covers' ? COVERS : tab === 'returns' ? RETURNS : CREDS;
  const base = tab === 'covers' ? 200 : tab === 'returns' ? 400 : 0;
  return src.map((r, i) => ({
    idx: i, name: r[0], line1: r[1], line2: r[2], cityLine: r[3], contact: r[4], archived: r[5], email: mail(r[4]),
    days: r[6] ?? '', hours: r[7] ?? '', instructions: r[8] ?? '', phone: r[9] ?? '',
    docNo: 'DOC ' + (10000 + base + i * 37),
  }));
}

/* ---------- Billing ---------- */

export function billingFor(o: Org) {
  return {
    line1: '1234 Elm Street', line2: 'Main Office', city: 'Boston', region: 'Massachusetts', postal: '83920', country: 'United States',
    po: '1234567890', email: o.email, contact: o.contactName,
  };
}

/** Some orgs start with billing waiting for approval (same rule as the prototype). */
export function billNeedsApproval(o: Org) {
  const n = String(o.num);
  let h = 0;
  for (let i = 0; i < n.length; i++) h = (h * 31 + n.charCodeAt(i)) % 97;
  return h % 3 === 0;
}

/* ---------- Contacts ---------- */

export interface Contact {
  id: string; role: string; first: string; last: string; email: string; phone: string; ext: string;
  title: string; dept: string; active: boolean; country: string; street: string; city: string; state: string; zip: string;
}

export function contactsFor(o: Org): Contact[] {
  const dom = domainOf(o);
  const addr = { country: 'United States', street: '5808 University Way', city: 'Boston', state: 'Massachusetts', zip: '83920' };
  return [
    { id: 'k1', role: 'Main Point of Contact, Decision Maker', first: 'Sophia', last: 'Greene', email: 'sophia@' + dom, phone: '(757) 980-9030', ext: '', title: 'Registrar', dept: 'Registrar’s Office', active: true, ...addr },
    { id: 'k2', role: 'Orderer', first: 'Sam', last: 'Lee', email: 'samlee@' + dom, phone: '(312) 555-0198', ext: '204', title: 'IT Director', dept: 'Diplomas', active: true, ...addr },
    { id: 'k3', role: 'IT Contact', first: 'Noah', last: 'Patel', email: 'noah@' + dom, phone: '(202) 555-0147', ext: '', title: 'IT Director', dept: 'Information Technology', active: true, ...addr },
  ];
}

/* ---------- Punctuation Data ---------- */

export const PUNCTUATION: [string, string][][] = [
  [['Middle Initials', 'All middle initials followed by a period.']],
  [['Jr & Sr Abbreviations: Periods', 'Run my list exactly as I submit it.'], ['Jr & Sr Abbreviations: Preceding Commas', 'No Junior and Senior abbreviations preceded by a comma.']],
  [['Roman Numeral Suffixes: Commas', 'No roman numeral suffixes preceded by a comma.']],
  [['Hyphenated Degrees/Majors', 'Spaces should surround hyphens in degrees and majors.'], ['Hyphenated Names', 'Run my list exactly as I submit it.']],
  [['Ampersand & Plus Sign Conversions', 'Convert ampersands and plus signs to “and”.']],
  [['Additional Notes', 'No additional notes.']],
];

/* ---------- Add organization: organizations in NAV ---------- */

export const NAV_ORGS = [
  { num: 1800, name: 'Harvard University' },
  { num: 1801, name: 'Harvard Law School' },
  { num: 1802, name: 'Boston College' },
  { num: 1803, name: 'Northeastern University' },
  { num: 1804, name: 'Tufts University' },
  { num: 1805, name: 'Emerson College' },
  { num: 1806, name: 'Rhode Island School of Design' },
  { num: 1807, name: 'University of Vermont' },
];

/* ---------- Settings ---------- */

export interface CertType { type: string; desc: string; pkg: string | null }
export interface Schedule { on: boolean; freq: string; weekly: string; twice: string[]; monthDay: string }
export interface OrgSettings {
  display: { name: string };
  ced: { on: boolean; purchase: string; auth: string; start: string; price: string; cedOnly: boolean; page2: boolean; legacy: boolean; domain: string; subdomain: string; contracts: string; internalEmail: string; logos: number; diplomas: number };
  store: { on: boolean; first: string; additional: string; applies: string; certs: CertType[]; ld: boolean };
  reorder: { on: boolean; domain: string; subdomain: string; logos: number };
  hold: Schedule & { emails: string };
  batch: Schedule;
}

export const PACKAGING: [string, string, string][] = [
  ['large-tube', 'Large Tube', '18×3×3'], ['small-tube', 'Small Tube', '15×2×2'], ['mailer-5', '#5 Mailer', '13×10×1'],
  ['mailer-4', '#4 Mailer', '15×13×1'], ['mailer-6', '#6 Mailer', '18×13×1'], ['mailer-7', '#7 Mailer', '21×17×1'], ['none', 'No packaging required', ''],
];

const HB = ['8511-CLIMB', '8511-CSMLLONGFORM', '8511-CSMLSPEC', '8511-LONGFORM-1SIG', '8511-LONGFORM-2SIG', '8511-LONGFORM-3SIG', '8511-SPEC-CORE', '8511-SPEC-CRED-1SIG', '8511-SPEC-CRED-3SIG', '8511-SPEC', 'MICROCREDENTIAL'];
const GR = ['8511-MA', '8511-MS', '8511-MBA', '8511-MED', '8511-EDD', '8511-PHD', '8511-CERT-GRAD', 'MICROCREDENTIAL'];
const DESC: Record<string, string> = {
  LONG: 'Your official long-form diploma, printed on heavyweight parchment with the university seal. It ships rolled in a rigid tube so it arrives without creases.',
  SPEC: 'Your official specialization certificate, printed on secure paper and shipped flat in a protective mailer.',
  CSML: 'Your official certificate of specialized management, printed on secure paper and shipped flat in a protective mailer.',
  CLIMB: 'Your official CLIMB certificate, printed on secure paper and shipped flat in a protective mailer.',
  MICRO: 'A printed copy of your microcredential on standard paper. Ships in a plain envelope.',
};

export function seedSettings(o: Org): OrgSettings {
  const full = o.setup.reorders && o.setup.emailAuth && o.seedIndex < 6;
  const dom = domainOf(o);
  const hold = { on: o.setup.holds, freq: '', weekly: '', twice: [] as string[], monthDay: '', emails: o.holdEmail };
  if (o.num === 1419) Object.assign(hold, { freq: 'weekly', weekly: 'Tue' });
  if (!full) {
    return {
      display: { name: o.displayName ?? '' },
      ced: { on: false, purchase: '', auth: '', start: '', price: '', cedOnly: false, page2: false, legacy: false, domain: '', subdomain: '', contracts: '', internalEmail: '', logos: 0, diplomas: 0 },
      store: { on: false, first: '', additional: '', applies: 'certtype', certs: GR.map((t) => ({ type: t, desc: '', pkg: null })), ld: false },
      reorder: { on: o.setup.reorders, domain: '', subdomain: '', logos: 0 },
      hold,
      batch: { on: false, freq: '', weekly: '', twice: [], monthDay: '' },
    };
  }
  const certs = HB.map((t) => {
    const k = /LONGFORM/.test(t) && !/CSML/.test(t) ? 'LONG' : /CSML/.test(t) ? 'CSML' : /CLIMB/.test(t) ? 'CLIMB' : /MICRO/.test(t) ? 'MICRO' : 'SPEC';
    return { type: t, desc: DESC[k], pkg: k === 'LONG' ? 'large-tube' : k === 'MICRO' ? 'none' : 'mailer-5' };
  });
  return {
    display: { name: o.displayName ?? '' },
    ced: { on: true, purchase: 'student', auth: 'email', start: '2024-08-01', price: '14.95', cedOnly: false, page2: false, legacy: false, domain: dom, subdomain: 'credentials', contracts: '2024-07-15', internalEmail: '2024-07-22', logos: 2, diplomas: 3 },
    store: { on: true, first: '45.00', additional: '25.00', applies: 'certtype', certs, ld: true },
    reorder: { on: o.setup.reorders, domain: dom, subdomain: 'reorder', logos: 1 },
    hold: o.setup.holds ? { ...hold, freq: hold.freq || 'weekly', weekly: hold.weekly || 'Tue' } : hold,
    batch: { on: true, freq: 'weekly', weekly: 'Tue', twice: ['Tue'], monthDay: '' },
  };
}

/** "MM/DD/YYYY h:mm:ss AM", the Action log's timestamp format. */
export function stampNow() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, '0');
  let hr = d.getHours();
  const ap = hr >= 12 ? 'PM' : 'AM';
  hr = hr % 12 || 12;
  return `${p(d.getMonth() + 1)}/${p(d.getDate())}/${d.getFullYear()} ${hr}:${p(d.getMinutes())}:${p(d.getSeconds())} ${ap}`;
}
