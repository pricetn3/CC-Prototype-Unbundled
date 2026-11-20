/* Org profile › Contacts: contact roles table and a read-only contact details panel. */

import { useState } from 'react';
import { Check } from 'lucide-react';
import type { Org } from '../../data/orgs';
import { contactsFor, type Contact } from '../../data/orgProfile';
import { Drawer } from '../../components/Drawer';
import s from './OrgTabs.module.css';

export function ContactsTab({ org }: { org: Org }) {
  const contacts = contactsFor(org);
  const [openId, setOpenId] = useState<string | null>(null);
  const ct = contacts.find((c) => c.id === openId);

  return (
    <>
      <div className={s.head}>
        <h2 className={s.h2}>Contacts</h2>
        <p className={s.sub}>Roles are required for ordering and must be confirmed twice a year.</p>
      </div>
      <div className={s.tableWrap}>
        <table className={s.table}>
          <thead>
            <tr>
              <th style={{ width: 64 }}>Active</th>
              <th>Role</th>
              <th>Name &amp; Email</th>
              <th>Phone</th>
              <th>Title</th>
              <th style={{ width: 72 }}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} className={openId === c.id ? s.rowSel : undefined}>
                <td><span className={s.activeDot} role="img" aria-label={c.active ? 'Active' : 'Inactive'}><Check size={12} aria-hidden="true" /></span></td>
                <td className={s.strong}>{c.role}</td>
                <td><div className={s.strong}>{c.first} {c.last}</div><div>{c.email}</div></td>
                <td style={{ whiteSpace: 'nowrap' }}>{c.phone}</td>
                <td>{c.title}</td>
                <td><button type="button" className={`cc-link cc-link-btn ${s.linkStrong}`} aria-label={`View ${c.first} ${c.last}`} onClick={() => setOpenId(c.id)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {ct && <ContactDrawer ct={ct} onClose={() => setOpenId(null)} />}
    </>
  );
}

function ContactDrawer({ ct, onClose }: { ct: Contact; onClose: () => void }) {
  const F = (label: string, value: string, full = false, hint = '') => ({ label, value, full, hint, req: label !== 'Extension' });
  const fields = [
    F('Contact Role', ct.role, true, 'Roles are confirmed twice a year.'), F('First Name', ct.first), F('Last Name', ct.last), F('Phone', ct.phone), F('Extension', ct.ext),
    F('Email', ct.email, true), F('Title', ct.title), F('Department', ct.dept), F('Country', ct.country, true), F('Address', ct.street, true), F('City', ct.city, true),
    F('State', ct.state), F('Zip code', ct.zip),
  ];
  return (
    <Drawer
      title={`${ct.first} ${ct.last}`}
      subtitle="View contact information"
      onClose={onClose}
      footer={<button type="button" className="cc-btn cc-btn--secondary" onClick={onClose}>Close</button>}
    >
      <div className={s.formGrid}>
        {fields.map((f) => {
          const id = 'op-ct-' + f.label.toLowerCase().replace(/[^a-z]+/g, '-');
          return (
            <div key={f.label} className={f.full ? s.full : undefined}>
              <label htmlFor={id} className={s.label}>{f.label}{f.req && <> <span aria-hidden="true" className={s.req}>*</span></>}</label>
              <input id={id} type="text" className="cc-input" style={{ width: '100%' }} value={f.value} readOnly aria-describedby={f.hint ? id + '-hint' : undefined} />
              {f.hint && <p id={id + '-hint'} className={s.hint}>{f.hint}</p>}
            </div>
          );
        })}
      </div>
    </Drawer>
  );
}
