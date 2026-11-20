/* Sample organizations, ported from the Internal CC Platform prototype's seed data.
   Users are fictional. Org IDs match the prototype (Virginia Hanock University is 2052). */

import vhuLogo from '../assets/org-logos/2052.png';
import aicLogo from '../assets/org-logos/1450.png';
import columbiaLogo from '../assets/org-logos/columbia.png';
import elonLogo from '../assets/org-logos/elon.png';
import tulaneLogo from '../assets/org-logos/tulane.png';

export type OrgStatus = 'active' | 'inactive' | 'hold';

export interface OrgSetup {
  shipping: boolean;
  billing: boolean;
  punctuation: boolean;
  reorders: boolean;
  holds: boolean;
  emailAuth: boolean;
}

export interface Org {
  id: string;
  num: number;
  name: string;
  type: string;
  status: OrgStatus;
  users: number;
  setup: OrgSetup;
  contactName: string;
  email: string;
  holdEmail: string;
  displayName?: string;
  auditDate: string;
  shipBy: string;
  billBy: string;
  punctBy: string;
  usersList: { id: string; name: string; email: string; role: string }[];
  /** Position in the seed list. The prototype gives the first six fully set-up orgs complete settings. */
  seedIndex: number;
}

type Row = [name: string, type: string, status: OrgStatus, city: string, region: string, users: number, setupBits: string];

const rows: Row[] = [
  ['Albany Medical College', 'Medical school', 'active', 'Albany', 'New York', 34, '111110'],
  ['Albertus Magnus College', 'College', 'active', 'New Haven', 'Connecticut', 12, '110100'],
  ['American River College', 'College', 'inactive', 'Sacramento', 'California', 8, '100000'],
  ['Auburn University', 'University', 'active', 'Auburn', 'Alabama', 61, '111111'],
  ['Baldwin-Wallace University', 'University', 'active', 'Berea', 'Ohio', 22, '111010'],
  ['Ball State University', 'University', 'hold', 'Muncie', 'Indiana', 40, '110110'],
  ['Bard College', 'College', 'active', 'Annandale', 'New York', 15, '111100'],
  ['Barnard College', 'College', 'active', 'New York', 'New York', 19, '111110'],
  ['Baylor University', 'University', 'active', 'Waco', 'Texas', 73, '111111'],
  ['Bentley University', 'University', 'active', 'Waltham', 'Massachusetts', 28, '111010'],
  ['Berea College', 'College', 'inactive', 'Berea', 'Kentucky', 6, '100000'],
  ['Bryn Mawr College', 'College', 'active', 'Bryn Mawr', 'Pennsylvania', 17, '111100'],
  ['Carleton College', 'College', 'active', 'Northfield', 'Minnesota', 21, '111110'],
  ['Champlain College', 'College', 'hold', 'Burlington', 'Vermont', 13, '110100'],
  ['Clark University', 'University', 'active', 'Worcester', 'Massachusetts', 25, '111010'],
  ['Drexel University', 'University', 'active', 'Philadelphia', 'Pennsylvania', 88, '111111'],
  ['Emerson College', 'College', 'active', 'Boston', 'Massachusetts', 30, '111100'],
  ['Fordham University', 'University', 'active', 'New York', 'New York', 64, '111111'],
  ['Grinnell College', 'College', 'inactive', 'Grinnell', 'Iowa', 9, '110000'],
  ['Hampshire College', 'College', 'active', 'Amherst', 'Massachusetts', 11, '110100'],
  ['Kenyon College', 'College', 'active', 'Gambier', 'Ohio', 16, '111100'],
  ['Lewis & Clark College', 'College', 'active', 'Portland', 'Oregon', 23, '111010'],
  ['Oberlin College', 'College', 'active', 'Oberlin', 'Ohio', 27, '111110'],
  ['Pomona College', 'College', 'active', 'Claremont', 'California', 18, '111100'],
  ['Reed College', 'College', 'hold', 'Portland', 'Oregon', 14, '110110'],
  ['Skidmore College', 'College', 'active', 'Saratoga Springs', 'New York', 20, '111010'],
  ['Swarthmore College', 'College', 'active', 'Swarthmore', 'Pennsylvania', 22, '111110'],
  ['Vassar College', 'College', 'active', 'Poughkeepsie', 'New York', 24, '111100'],
  ['Whitman College', 'College', 'inactive', 'Walla Walla', 'Washington', 7, '100000'],
  ['American Assoc of Justice', 'Professional association', 'active', 'Washington', 'DC', 42, '111011'],
];

// Added later in the prototype; IDs continue at 1450.
const extraRows: Row[] = [
  ['American International College', 'College', 'active', 'Springfield', 'Massachusetts', 18, '111100'],
  ['Colgate University', 'University', 'active', 'Hamilton', 'New York', 24, '111100'],
  ['Columbia University', 'University', 'active', 'New York', 'New York', 92, '111111'],
  ['Davidson College', 'College', 'active', 'Davidson', 'North Carolina', 19, '111100'],
  ['Denison University', 'University', 'inactive', 'Granville', 'Ohio', 9, '100000'],
  ['DePaul University', 'University', 'active', 'Chicago', 'Illinois', 55, '111110'],
  ['Elon University', 'University', 'active', 'Elon', 'North Carolina', 38, '111111'],
  ['Furman University', 'University', 'hold', 'Greenville', 'South Carolina', 21, '110110'],
  ['Gonzaga University', 'University', 'active', 'Spokane', 'Washington', 33, '111010'],
  ['Lafayette College', 'College', 'active', 'Easton', 'Pennsylvania', 17, '111100'],
  ['Loyola University Chicago', 'University', 'active', 'Chicago', 'Illinois', 61, '111111'],
  ['Marquette University', 'University', 'active', 'Milwaukee', 'Wisconsin', 44, '111110'],
  ['Pepperdine University', 'University', 'active', 'Malibu', 'California', 29, '111010'],
  ['Rice University', 'University', 'active', 'Houston', 'Texas', 47, '111111'],
  ['Tulane University', 'University', 'active', 'New Orleans', 'Louisiana', 52, '111111'],
  ['Villanova University', 'University', 'inactive', 'Villanova', 'Pennsylvania', 12, '110000'],
];

const bits = (s: string): OrgSetup => ({
  shipping: s[0] === '1', billing: s[1] === '1', punctuation: s[2] === '1',
  reorders: s[3] === '1', holds: s[4] === '1', emailAuth: s[5] === '1',
});

const emailDomain = (name: string) => name.toLowerCase().split(/\s+/)[0].replace(/[^a-z]/g, '') + '.edu';

const AUDIT = {
  auditDate: '6/15/2021 11:57:00 am',
  shipBy: 'rmorgan@paradigm-corp.com',
  billBy: 'rmorgan@paradigm-corp.com',
  punctBy: 'cbennett@paradigm-corp.com',
};

export function initials(name: string): string {
  const w = name.replace(/&/g, '').split(/\s+/).filter(Boolean);
  return ((w[0] ? w[0][0] : '') + (w[1] ? w[1][0] : w[0] ? w[0][1] : '')).toUpperCase();
}

export function seedOrgs(): Org[] {
  const list: Org[] = rows.concat(extraRows).map((r, i) => {
    const [name, type, status, , , users, sb] = r;
    const num = i < rows.length ? 1419 + i : 1450 + (i - rows.length);
    const dom = emailDomain(name);
    return {
      id: 'org-' + num, num, name, type, status, users,
      setup: bits(sb),
      contactName: 'Registrar Office',
      email: 'registrar@' + dom,
      holdEmail: 'holds@' + dom,
      ...AUDIT,
      usersList: [
        { id: 'u1', name: 'Jordan Blake', email: 'jblake@' + dom, role: 'Admin' },
        { id: 'u2', name: 'Sam Rivera', email: 'srivera@' + dom, role: 'Member' },
      ],
      seedIndex: 0,
    };
  });
  list.sort((a, b) => a.name.localeCompare(b.name));

  // Featured org, fully populated.
  list.unshift({
    id: 'org-1800', num: 2052, name: 'Virginia Hanock University', type: 'University', status: 'active', users: 47,
    setup: { shipping: true, billing: true, punctuation: true, reorders: true, holds: false, emailAuth: true },
    contactName: 'Samantha Bright', email: 'samanthabright@vahanock.edu', holdEmail: 'nancylow@vahanock.edu',
    ...AUDIT,
    usersList: [
      { id: 'u1', name: 'Dana Park', email: 'dpark@vhu.edu', role: 'Admin' },
      { id: 'u2', name: 'Olivia Rhye', email: 'orhye@vhu.edu', role: 'Manager' },
      { id: 'u3', name: 'Marcus Lee', email: 'mlee@vhu.edu', role: 'Member' },
      { id: 'u4', name: 'Priya Shah', email: 'pshah@vhu.edu', role: 'Member' },
      { id: 'u5', name: 'Dana Cole', email: 'dcole@vahanock.edu', role: 'Invited' },
    ],
    seedIndex: 0,
  });
  return list.map((o, i) => ({ ...o, seedIndex: i }));
}

const LOGOS: Record<string, string> = {
  'Virginia Hanock University': vhuLogo,
  'American International College': aicLogo,
  'Columbia University': columbiaLogo,
  'Elon University': elonLogo,
  'Tulane University': tulaneLogo,
};

/** Logo for the org profile header, or null (the header then shows an initials tile). */
export function orgLogo(o: Org): string | null {
  return LOGOS[o.name] ?? null;
}

/** Initials tile colors, by status. */
export function avatarTone(o: Org) {
  if (o.status === 'inactive') return { bg: 'var(--gray-100)', fg: 'var(--gray-600)' };
  if (o.status === 'hold') return { bg: 'var(--error-50)', fg: 'var(--error-700)' };
  return { bg: 'var(--blue-100)', fg: 'var(--blue-800)' };
}

/* ---------- Settings summary (Organizations › Settings column, Org profile › Settings card) ---------- */

export type SettingStatus = 'done' | 'off' | 'todo';

export interface SettingRow {
  key: string;
  label: string;
  status: SettingStatus;
  /** Status text shown beside the label. */
  statusLabel: string;
}

// Alphabetical: every settings section carries equal weight.
const SECTIONS: [key: string, label: string][] = [
  ['batch', 'API Order Batching'],
  ['ced', 'Digital Credentials'],
  ['hold', 'Hold Management'],
  ['display', 'Paper Authentication'],
  ['reorder', 'Reorder Management'],
  ['store', 'Paper Credentials'],
];

/** American International College (1450) is a digital-only client, so it has no Paper Authentication section. */
const isPaperClient = (o: Org) => o.num !== 1450;

export function settingsSummary(o: Org) {
  // Orgs near the top of the seed list with reorders and email authentication on start fully set up.
  const full = o.setup.reorders && o.setup.emailAuth && o.seedIndex < 6;
  const statusOf = (key: string): SettingStatus => {
    switch (key) {
      case 'ced':
      case 'store':
      case 'batch':
        return full ? 'done' : 'off';
      case 'reorder':
        return o.setup.reorders ? 'done' : 'off';
      case 'hold':
        return o.setup.holds ? 'done' : 'off';
      case 'display':
        return o.displayName?.trim() ? 'done' : 'todo';
      default:
        return 'todo';
    }
  };
  const rows: SettingRow[] = SECTIONS.filter(([k]) => k !== 'display' || isPaperClient(o)).map(([key, label]) => {
    const status = statusOf(key);
    const statusLabel =
      key === 'batch'
        ? status === 'done' ? 'Scheduled' : status === 'off' ? 'Not set' : 'Incomplete'
        : status === 'done' ? 'On' : status === 'off' ? 'Off' : 'Incomplete';
    return { key, label, status, statusLabel };
  });
  const done = rows.filter((r) => r.status === 'done').length;
  const todo = rows.filter((r) => r.status === 'todo').length;
  return { rows, done, todo, off: rows.length - done - todo, total: rows.length };
}
