/* PROTOTYPE ONLY. Sample org settings the panel can load on an org's Settings tab,
   matching the design's "All set up", "Mixed" and "New organization". */

import { seedSettings, type OrgSettings } from '../data/orgProfile';
import type { Org, OrgSetup } from '../data/orgs';

export type Scenario = 'all' | 'mixed' | 'new';
export const SCENARIOS: [Scenario, string][] = [['all', 'All set up'], ['mixed', 'Mixed'], ['new', 'New organization']];

export function scenarioFor(org: Org, scn: Scenario): { settings: OrgSettings; setup: Partial<OrgSetup>; displayName: string } {
  const fullOrg: Org = { ...org, seedIndex: 0, setup: { ...org.setup, reorders: true, holds: true, emailAuth: true } };
  const blankOrg: Org = { ...org, seedIndex: 99, displayName: '', setup: { ...org.setup, reorders: false, holds: false, emailAuth: false } };
  const full = seedSettings(fullOrg);
  const blank = seedSettings(blankOrg);
  if (scn === 'all') {
    return {
      settings: { ...full, display: { name: org.name }, hold: { ...full.hold, on: true, freq: 'weekly', weekly: 'Fri', emails: 'registrar@school.edu' } },
      setup: { reorders: true, holds: true, emailAuth: true }, displayName: org.name,
    };
  }
  if (scn === 'mixed') {
    return {
      settings: { ...full, display: { name: org.name }, store: blank.store, ld: blank.ld, hold: blank.hold },
      setup: { reorders: true, holds: false, emailAuth: true }, displayName: org.name,
    };
  }
  return { settings: { ...blank, display: { name: '' } }, setup: { reorders: false, holds: false, emailAuth: false }, displayName: '' };
}
