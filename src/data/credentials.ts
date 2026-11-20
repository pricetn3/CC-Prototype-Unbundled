/* Sample credentials, generated from the sample orders the way the Internal CC Platform prototype does (credSeed). */

import { ORDERS } from './orders';

export interface Credential {
  id: string; so: string; orderId: string; orderOrg: string; name: string; ind: string;
  school: string; credential: string; major: string; date: string;
  paper: boolean; digital: boolean; invalid: boolean; cedid: string;
  ordered: string; ship: string; release: string; tracking: string;
  email: string; phone: string; ship1: string; ship2: string; ship3: string;
  lastDl: string; lastSent: string; sentBy: string; expires: string;
}

const people: [string, string, string][] = [['Jessica', 'Marie Thompson', 'Ph.D.'], ['David', 'William Kim', 'M.D.'], ['Emma', 'Anderson', ''], ['Liam', 'Bennett', ''], ['Ava', 'Carter', ''], ['Noah', 'Diaz', ''], ['Sophia', 'Ellis', ''], ['Ethan', 'Foster', ''],
  ['Mia', 'Garcia', ''], ['Lucas', 'Hughes', ''], ['Grace', 'Iverson', ''], ['Henry', 'Jensen', ''], ['Chloe', 'Lopez', ''], ['Owen', 'Morgan', ''], ['Nora', 'Nguyen', ''], ['Caleb', 'Ortiz', '']];
const schools = ['School of Art', 'School of Engineering', 'School of Medicine', 'School of Philosophy', 'School of Literature', 'School of Business'];
const creds = [['Bachelor of Science', 'Psychology'], ['Master of Arts', 'Art History'], ['Master of Science', 'Environmental Studies'], ['Doctor of Philosophy', 'Sociology'], ['Associate of Arts', 'History'], ['Bachelor of Arts', 'English']];
const dates = ['Jan 6, 2025', 'Jan 2, 2025', 'Jan 1, 2024', 'Jan 5, 2025', 'Dec 31, 2024', 'May 15, 2026'];
const streets = ['123 Home Lane, Apt. 412', '48 Elm Street', '9 Harbor Way, Unit 3', '2201 College Ave', '77 Maple Court', '15 Ridge Road'];
const cities = ['Boston, Massachusetts, 02115', 'Cambridge, Massachusetts, 02138', 'Providence, Rhode Island, 02903', 'Hartford, Connecticut, 06103'];
const L = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const code = (n: number, k: number) => Array.from({ length: k }, (_, j) => L[(n * 31 + j * 17 + n * j * 7) % L.length]).join('');

function build(): Credential[] {
  const out: Credential[] = [];
  let n = 0;
  ORDERS.filter((o) => o.status !== 'cancelled').forEach((o, oi) => {
    const isDig = /digital|micro/i.test(o.type);
    const count = 3 + (oi % 4);
    const shipped = o.shipDate && o.shipDate !== '-' ? o.shipDate : '';
    for (let j = 0; j < count; j++, n++) {
      const pi = (oi * 5 + j * 3) % people.length;
      const p = people[pi];
      const c = creds[(n * 3) % creds.length];
      out.push({
        id: 'cr-' + n, so: o.so, orderId: o.id, orderOrg: o.org, name: p[0] + ' ' + p[1] + (p[2] ? ' ' + p[2] : ''), ind: String(60440 + pi),
        school: schools[(n * 5) % schools.length], credential: c[0], major: c[1], date: dates[(n * 5) % dates.length],
        paper: !isDig, digital: isDig || j % 3 !== 2, invalid: n % 9 === 4,
        cedid: '22' + code(n, 1) + '-' + code(n + 3, 4) + '-' + code(n + 7, 4),
        ordered: o.date, ship: shipped || 'TBD', release: o.digitalRelease || shipped || 'TBD',
        tracking: '1Z12345E0' + String(291980793 + n * 7919).slice(0, 9),
        email: (p[0] + p[1].split(' ')[0]).toLowerCase() + (14 + pi) + '@gmail.com', phone: '(' + (123 + pi) + ') 456-' + String(7890 + pi).slice(-4),
        ship1: p[0] + ' ' + p[1].split(' ').slice(-1)[0], ship2: streets[pi % streets.length], ship3: cities[pi % cities.length] + ', United States',
        lastDl: n % 2 ? 'Jan 6th, 2025, 2:24 PM' : '', lastSent: n % 3 ? 'Jan 8th, 2025, 12:37 PM' : '', sentBy: n % 3 ? 'Ashley Tisdale' : '', expires: 'Jan 20th, 2030, 12:00 AM',
      });
    }
  });
  return out;
}

export const CREDENTIALS: Credential[] = build();

export type CredTab = 'paper' | 'digital';
export type CritKey = 'name' | 'ind' | 'so' | 'cedid' | 'date';

export const CRED_DEFS: Record<CredTab, { cols: string[]; crit: [CritKey, string][]; facets: [string, string][] }> = {
  paper: {
    cols: ['Name', 'School Name', 'Credential', 'Major', 'Conferral Date'],
    crit: [['name', 'Name'], ['ind', 'Individual ID'], ['so', 'SO Number'], ['date', 'Conferral Date (2 year range)']],
    facets: [['name', 'Student'], ['school', 'School'], ['credential', 'Credential'], ['major', 'Major'], ['date', 'Conferral Date']],
  },
  digital: {
    cols: ['Name', 'SO Number', 'School Name', 'Credential', 'Conferral Date', 'Status', 'Auth Link'],
    crit: [['name', 'Name'], ['ind', 'Individual ID'], ['cedid', 'CeDiD'], ['so', 'SO Number'], ['date', 'Conferral Date (2 year range)']],
    facets: [['name', 'Student'], ['so', 'SO Number'], ['school', 'School'], ['credential', 'Credential'], ['date', 'Conferral Date'], ['status', 'Status']],
  },
};

/** "Jan 6th, 2025, 2:24 PM" style stamp, as the prototype writes it. */
export function credStamp(d = new Date()): string {
  const M = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = d.getDate();
  const sfx = day % 10 === 1 && day !== 11 ? 'st' : day % 10 === 2 && day !== 12 ? 'nd' : day % 10 === 3 && day !== 13 ? 'rd' : 'th';
  let h = d.getHours(); const ap = h >= 12 ? 'PM' : 'AM'; h = h % 12 || 12;
  return `${M[d.getMonth()]} ${day}${sfx}, ${d.getFullYear()}, ${h}:${String(d.getMinutes()).padStart(2, '0')} ${ap}`;
}
