/* Sample signatures, ported from the Internal CC Platform prototype's seed data. Names are fictional. */

export type SigStatus = 'pending' | 'current' | 'expired';
export type SigPeriod = 'current' | 'past' | 'inactive';

export interface Signature {
  id: string;
  name: string;
  org: string;
  orgNum: string;
  title: string;
  school: string;
  status: SigStatus;
  effective: string;
  endDate: string;
  period: SigPeriod;
  signed: boolean;
  sigName: string;
  note?: string;
  internalNote?: string;
}

type Row = [string, string, string, string, string, SigStatus, string, string, SigPeriod, boolean, string];

const rows: Row[] = [
  ['Dr. Dan Johnson', 'Harvard Faculty of Arts & Science', '1800', 'Dean', 'Law School', 'pending', '08/01/2025', '07/22/2025', 'current', false, ''],
  ['Dr. Eleanor Vance', 'Harvard Graduate School of Design', '1801', 'Registrar', 'Business School', 'pending', '08/08/2025', '08/15/2025', 'current', false, ''],
  ['Professor Kenji Tanaka', 'Harvard Business School', '1802', 'Interim Dean', 'Medical School', 'pending', '08/15/2025', '09/01/2025', 'current', false, ''],
  ['John Smith', 'Harvard Medical School', '1803', 'Assistant Dean', 'School of Engineering', 'current', '08/22/2025', '10/31/2025', 'current', true, ''],
  ['Nathan L. Turner', 'Harvard Divinity School', '1805', 'Department Chair', 'School of Public Health', 'current', '08/29/2025', '11/25/2025', 'current', true, ''],
  ['Joshua L. Bennett', 'Harvard Law School', '1806', 'Program Coordinator', 'School of Social Work', 'current', '06/01/2025', '12/14/2025', 'current', true, ''],
  ['Henry Stanley', 'Harvard School of Dental Medicine', '1807', 'Academic Advisor', 'School of Education', 'current', '06/24/2025', '01/05/2026', 'current', true, ''],
  ['Dr. Kenji Hauhaum', 'Harvard Kennedy School', '1808', 'Research Director', 'School of Architecture', 'current', '07/13/2025', '01/28/2026', 'current', true, 'Dr. Hauhaum'],
  ['Emily M. Carter', 'Harvard School of Public Health', '1809', 'University Registrar', 'School of Nursing', 'current', '08/22/2025', '02/18/2026', 'current', true, ''],
  ['John Thompson', 'Harvard School of Engineering', '1810', 'Student Affairs Director', 'School of Pharmacy', 'current', '09/12/2025', '03/20/2026', 'current', true, ''],
  ['Michael Brown', 'Harvard Extension School', '1811', 'Curriculum Developer', 'Veterinary School', 'current', '10/03/2025', '04/03/2026', 'current', true, ''],
  ['Dr. Adam A Fischer', 'Harvard School of Education', '1812', 'Enrollment Specialist', 'Dental School', 'current', '10/29/2025', '04/29/2026', 'current', true, 'Dr. Fischer'],
  ['Dr. Priya Raman', 'Harvard Law School', '1806', 'Associate Dean', 'Law School', 'pending', '01/06/2024', '01/05/2025', 'past', false, ''],
  ['Owen Duarte', 'Harvard Graduate School of Design', '1801', 'Program Director', 'School of Architecture', 'pending', '03/12/2024', '03/11/2025', 'past', false, ''],
  ['Margaret Ellison', 'Harvard Medical School', '1803', 'Registrar', 'Medical School', 'expired', '02/01/2023', '01/31/2025', 'past', true, ''],
  ['Dr. Samuel Reyes', 'Harvard Kennedy School', '1808', 'Interim Provost', 'School of Public Health', 'expired', '09/01/2022', '08/31/2024', 'past', true, ''],
  ['Grace Lindqvist', 'Harvard Extension School', '1811', 'Registrar', 'School of Education', 'expired', '01/01/2021', '12/31/2022', 'inactive', true, ''],
  ['Dr. Alan Whitfield', 'Harvard Business School', '1802', 'Dean of Faculty', 'Business School', 'expired', '07/01/2020', '06/30/2022', 'inactive', true, ''],
  ['Kathy Ho', 'Harvard School of Public Health', '1809', 'Provost', 'School of Nursing', 'expired', '01/01/2019', '12/31/2021', 'inactive', true, ''],
];

export const SEED_SIGNATURES: Signature[] = rows.map((s, i) => ({
  id: 'sig-' + i, name: s[0], org: s[1], orgNum: s[2], title: s[3], school: s[4],
  status: s[5], effective: s[6], endDate: s[7], period: s[8], signed: s[9], sigName: s[10] || s[0],
}));

export const SIG_STATUS: Record<SigStatus, { label: string; badge: string }> = {
  pending: { label: 'Pending', badge: 'cc-badge--warning' },
  current: { label: 'Current', badge: 'cc-badge--success' },
  expired: { label: 'Expired', badge: '' },
};

const FONTS = ["'Mrs Saint Delafield', cursive", "'Style Script', cursive", "'Petit Formal Script', cursive"];
export const sigFontFor = (name: string) => FONTS[(name || '').length % 3];
export function sigSizeFor(name: string) {
  const n = name.length;
  return n <= 12 ? '26px' : n <= 16 ? '23px' : n <= 20 ? '20px' : n <= 24 ? '18px' : '16px';
}
