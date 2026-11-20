/* Sample orders, ported from the Internal CC Platform prototype's seed data. Dates are fixed sample dates. */

export type OrderStatus = 'pending' | 'queued' | 'inprogress' | 'inproduction' | 'cancelled' | 'shipped' | 'pendingrelease';

export interface Order {
  id: string; org: string; type: string; qty: number; status: OrderStatus; date: string; group: string;
  placedBy: string; interim: string; so: string; shipDate: string; digitalRelease: string;
}

type Row = [string, string, string, number, OrderStatus, string, string, string, string, string, string, string];
const rows: Row[] = [
  ['CC-2026-10-0512', 'Virginia Hanock University', 'Diploma · paper', 312, 'inproduction', '13 Oct 2026', 'Fall commencement', 'Michael Brown', '#43930283290051200', 'SO-0301927', '24 Oct 2026', ''],
  ['CC-2026-10-0505', 'Baylor University', 'Diploma · paper', 186, 'pending', '13 Oct 2026', "Class of '26", 'Dana Whitfield', '#43930283290050500', 'SO-0301920', '-', ''],
  ['CC-2026-10-0498', 'Drexel University', 'Digital', 1, 'pendingrelease', '12 Oct 2026', 'Digital reissue', 'Priya Nair', '#43930283290049800', 'SO-0301913', '-', '16 Oct 2026'],
  ['CC-2026-10-0491', 'Auburn University', 'Diploma · paper', 240, 'queued', '10 Oct 2026', 'Engineering', 'Robert Chen', '#43930283290049100', 'SO-0301906', '22 Oct 2026', ''],
  ['CC-2026-10-0484', 'Bard College', 'Diploma · paper', 32, 'cancelled', '9 Oct 2026', 'Duplicate — voided', 'Owen Duarte', '#43930283290048400', 'SO-0301996', '-', ''],
  ['CC-2026-10-0477', 'Fordham University', 'Certificate', 64, 'inprogress', '8 Oct 2026', 'Continuing Ed', 'Alice Kim', '#43930283290047700', 'SO-0301989', '20 Oct 2026', ''],
  ['CC-2026-10-0470', 'Ball State University', 'Diploma · paper', 98, 'pending', '7 Oct 2026', 'Summer graduates', 'Sandra Ellis', '#43930283290047000', 'SO-0301982', '-', ''],
  ['CC-2026-10-0463', 'Emerson College', 'Diploma · paper', 74, 'inproduction', '6 Oct 2026', 'Arts & media', 'Julian Ortega', '#43930283290046300', 'SO-0301975', '17 Oct 2026', ''],
  ['CC-2026-10-0456', 'Clark University', 'Digital', 40, 'pendingrelease', '3 Oct 2026', 'Graduate school', 'Nadia Feld', '#43930283290045600', 'SO-0301968', '-', '15 Oct 2026'],
  ['CC-2026-10-0449', 'Bentley University', 'Certificate', 55, 'shipped', '1 Oct 2026', 'Executive Ed', 'Kathy Ho', '#43930283290044900', 'SO-0301961', '9 Oct 2026', ''],
  ['CC-2026-10-0442', 'Champlain College', 'Digital', 18, 'shipped', '30 Sep 2026', 'Online programs', 'Grace Lindqvist', '#43930283290044200', 'SO-0301954', '-', '2 Oct 2026'],
  ['CC-2026-10-0435', 'Virginia Hanock University', 'Micro-credential', 128, 'shipped', '28 Sep 2026', 'Data analytics badge', 'Michael Brown', '#43930283290043500', 'SO-0301947', '6 Oct 2026', '7 Oct 2026'],
  ['CC-2026-10-0428', 'Drexel University', 'Diploma · paper', 145, 'inprogress', '26 Sep 2026', 'Nursing', 'Priya Nair', '#43930283290042800', 'SO-0301940', '14 Oct 2026', ''],
  ['CC-2026-10-0421', 'Auburn University', 'Diploma · paper', 22, 'cancelled', '24 Sep 2026', 'Incorrect spreadsheet', 'Robert Chen', '#43930283290042100', 'SO-0301933', '-', ''],
  ['CC-2026-10-0414', 'Baylor University', 'Certificate', 36, 'shipped', '22 Sep 2026', 'Law school', 'Dana Whitfield', '#43930283290041400', 'SO-0301926', '2 Oct 2026', ''],
  ['CC-2026-10-0407', 'Fordham University', 'Diploma · paper', 88, 'shipped', '19 Sep 2026', 'Business school', 'Alice Kim', '#43930283290040700', 'SO-0301919', '30 Sep 2026', ''],
  ['CC-2026-10-0400', 'Emerson College', 'Digital', 12, 'shipped', '17 Sep 2026', 'Reissue', 'Julian Ortega', '#43930283290040000', 'SO-0301912', '-', '19 Sep 2026'],
  ['CC-2026-10-0393', 'Clark University', 'Diploma · paper', 61, 'queued', '16 Sep 2026', 'Graduate school', 'Nadia Feld', '#43930283290039300', 'SO-0301905', '16 Oct 2026', ''],
  ['CC-2026-10-0386', 'Ball State University', 'Diploma · paper', 9, 'cancelled', '2 Sep 2026', 'Replaced by new order', 'Sandra Ellis', '#43930283290038600', 'SO-0301995', '-', ''],
  ['CC-2026-10-0379', 'Bentley University', 'Diploma · paper', 204, 'shipped', '28 Aug 2026', 'Summer commencement', 'Kathy Ho', '#43930283290037900', 'SO-0301988', '8 Sep 2026', ''],
  ['CC-2026-10-0372', 'Champlain College', 'Certificate', 27, 'shipped', '20 Aug 2026', 'Continuing Ed', 'Grace Lindqvist', '#43930283290037200', 'SO-0301981', '31 Aug 2026', ''],
];

export const ORDERS: Order[] = rows.map((o) => ({
  id: o[0], org: o[1], type: o[2], qty: o[3], status: o[4], date: o[5], group: o[6],
  placedBy: o[7], interim: o[8], so: o[9], shipDate: o[10], digitalRelease: o[11],
}));

/** The sample data's "today": the day after the newest order, so date filters match the fixed sample dates. */
export const ORDERS_TODAY = new Date(2026, 9, 14);

export const ORDER_STATUS_KEYS: OrderStatus[] = ['pending', 'queued', 'inprogress', 'inproduction', 'cancelled', 'shipped', 'pendingrelease'];

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: 'warning' | 'success' | 'error' }> = {
  pending: { label: 'Pending', tone: 'warning' },
  queued: { label: 'Queued', tone: 'warning' },
  inprogress: { label: 'In progress', tone: 'warning' },
  inproduction: { label: 'In production', tone: 'warning' },
  cancelled: { label: 'Cancelled', tone: 'error' },
  shipped: { label: 'Shipped', tone: 'success' },
  pendingrelease: { label: 'Pending release', tone: 'success' },
};

export const SERVICE_BY_STATUS: Record<OrderStatus, string> = {
  inproduction: '3 day', inprogress: '3 day', queued: '5 day', pending: '5 day', shipped: 'Standard', pendingrelease: 'Digital', cancelled: 'Standard',
};

export interface ShipAddress { name: string; line1: string; line2: string; cityLine: string; contact: string; email: string; archived: boolean }

/** Credential shipping addresses (the prototype gives every organization the same sample list). */
export function shipAddresses(orgEmail?: string): ShipAddress[] {
  const domain = orgEmail && orgEmail.includes('@') ? orgEmail.split('@')[1] : 'organization.com';
  const mail = (n: string) => n.toLowerCase().replace(/[^a-z ]/g, '').split(/\s+/).slice(0, 2).join('.') + '@' + domain;
  const list: [string, string, string, string, string, boolean][] = [
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
  return list.map((r) => ({ name: r[0], line1: r[1], line2: r[2], cityLine: r[3], contact: r[4], archived: r[5], email: mail(r[4]) }));
}

export const SERVICE_TYPES = [
  { key: 'standard', title: 'Standard processing', price: 'As contracted', days: 26 },
  { key: 'd5', title: '5 day processing', price: '$19.95 + $2.80 per document/as contracted', days: 5 },
  { key: 'd3', title: '3 day processing', price: '$19.95 + $2.80 per document/as contracted', days: 3 },
  { key: 'd1', title: '1 day processing', price: '$19.95 + $2.80 per document/as contracted', days: 0 },
];

export const CARRIERS = ['UPS Ground', 'UPS 2nd Day Air', 'UPS Next Day Air', 'FedEx Ground', 'USPS Priority Mail'];
