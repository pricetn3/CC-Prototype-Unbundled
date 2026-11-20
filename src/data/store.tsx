/* In-memory prototype data shared by every page. Resets on reload. */

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import countriesSeed from './countries.json';
import { seedOrgs, type Org } from './orgs';
import { seedLog, type LogEntry } from './actionLog';

export interface Country {
  name: string;
  code: string;
  on: boolean;
}

export const CURRENT_USER = {
  name: 'Jordan Avery',
  first: 'Jordan',
  initials: 'JA',
  email: 'javery@paradigm-corp.com',
};

/** Home metric numbers that come from screens not built yet (orders, signatures). */
export const HOME_COUNTS = { orders: 21, pendingSignatures: 5, signaturesUsed: 0 };

interface Store {
  orgs: Org[];
  countries: Country[];
  log: LogEntry[];
  updateOrg: (id: string, patch: Partial<Org>) => void;
  setCountries: (next: Country[]) => void;
  addLog: (entries: LogEntry[]) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [orgs, setOrgs] = useState<Org[]>(seedOrgs);
  const [countries, setCountries] = useState<Country[]>(countriesSeed as Country[]);
  const [log, setLog] = useState<LogEntry[]>(seedLog);

  const updateOrg = useCallback((id: string, patch: Partial<Org>) => {
    setOrgs((list) => list.map((o) => (o.id === id ? { ...o, ...patch } : o)));
  }, []);
  const addLog = useCallback((entries: LogEntry[]) => setLog((l) => entries.concat(l)), []);

  const value = useMemo(() => ({ orgs, countries, log, updateOrg, setCountries, addLog }), [orgs, countries, log, updateOrg, addLog]);
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): Store {
  const s = useContext(StoreContext);
  if (!s) throw new Error('useStore must be used inside StoreProvider');
  return s;
}
