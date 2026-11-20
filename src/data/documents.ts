/* Sample client and helpful documents and the FAQ, ported from the Internal CC Platform prototype's seed data. */

export interface DocPart { text: string; file?: boolean }
export interface DocLine { parts: DocPart[] }
export interface DocEvent { kind: 'Edited' | 'Uploaded' | 'Deleted'; who: string; when: string; lines: DocLine[] }

export interface ClientDoc {
  id: string; org: string; type: string; desc: string; ext: string; fileName: string; size: number;
  status: 'active' | 'deleted'; who: string; when: string; events: DocEvent[]; blobUrl?: string;
}
export interface HelpfulDoc {
  id: string; section: 'general' | 'shipping' | 'signatures'; name: string; who: string; when: string;
  ext: string; fileName: string; size: number; blobUrl?: string;
}

export const DOC_ORGS = [
  { num: '1800', name: 'Harvard University' },
  { num: '1801', name: 'Harvard Graduate School of Design' },
  { num: '1802', name: 'Harvard Business School' },
  { num: '2400', name: 'Virginia Hancock University' },
];

export const DOC_TYPES = ['Sample Spreadsheet', 'E-Note Template', 'Email Authorization', 'Signature Form', 'Other'];

export const DOC_SECTIONS: [HelpfulDoc['section'], string][] = [['general', 'General'], ['shipping', 'Ordering & Shipping'], ['signatures', 'Signatures']];

const L = (...parts: (string | { f: string })[]): DocLine => ({ parts: parts.map((p) => (typeof p === 'string' ? { text: p } : { text: p.f, file: true })) });
const ev = (kind: DocEvent['kind'], who: string, when: string, lines: DocLine[]): DocEvent => ({ kind, who, when, lines });

export const SEED_CLIENT_DOCS: ClientDoc[] = [
      { id: 'cd1', org: '1800', type: 'Sample Spreadsheet', desc: 'This document is active as of January 2026.', ext: 'xlsx', fileName: 'samplespreadsheet2026final.xlsx', size: 204800, status: 'active', who: 'Olivia Rhye', when: '01/10/2026, 3:52 PM EST',
        events: [ev('Edited', 'Olivia Rhye', '01/10/2026, 11:53 AM EST', [L('Replaced file ', { f: 'samplespreadsheet2026.xlsx' }, ' with ', { f: 'samplespreadsheet2026final.xlsx' })]),
          ev('Edited', 'Olivia Rhye', '01/10/2026, 11:52 AM EST', [L('Replaced file ', { f: 'samplespreadsheet2025.xlsx' }, ' with ', { f: 'samplespreadsheet2026.xlsx' }), L('Updated description from "This document is active as of January 2025." to "This document is active as of January 2026."'), L('Changed document type from E-Note Template to Sample Spreadsheet')]),
          ev('Uploaded', 'Olivia Rhye', '01/04/2025, 3:52 PM EST', [L('Initial document was created.')])] },
      { id: 'cd2', org: '1800', type: 'E-Note Template', desc: 'This document is active as of January 2026.', ext: 'pdf', fileName: 'harvard-enote-template-2026.pdf', size: 512000, status: 'active', who: 'Olivia Rhye', when: '01/10/2026, 3:52 PM EST',
        events: [ev('Edited', 'Olivia Rhye', '01/10/2026, 3:52 PM EST', [L('Replaced file ', { f: 'harvard-enote-template-2025.pdf' }, ' with ', { f: 'harvard-enote-template-2026.pdf' })]),
          ev('Edited', 'Olivia Rhye', '01/10/2026, 3:50 PM EST', [L('Updated description from "This document is active as of January 2025." to "This document is active as of January 2026."')]),
          ev('Uploaded', 'Olivia Rhye', '01/06/2025, 10:12 AM EST', [L('Initial document was created.')])] },
      { id: 'cd3', org: '1800', type: 'Other', desc: 'Example of your email authorization.', ext: 'png', fileName: 'email-authorization-example.png', size: 98304, status: 'active', who: 'Olivia Rhye', when: '01/10/2026, 3:52 PM EST',
        events: [ev('Uploaded', 'Olivia Rhye', '01/10/2026, 3:52 PM EST', [L('Initial document was created.')])] },
      { id: 'cd4', org: '1800', type: 'Sample Spreadsheet', desc: 'This document was active as of January 2025.', ext: 'xlsx', fileName: 'samplespreadsheet2025.xlsx', size: 196608, status: 'deleted', who: 'Olivia Rhye', when: '01/10/2026, 3:52 PM EST',
        events: [ev('Deleted', 'Olivia Rhye', '01/10/2026, 3:52 PM EST', [L('Document was deleted.')]), ev('Edited', 'Olivia Rhye', '06/02/2025, 9:15 AM EST', [L('Updated description')]), ev('Uploaded', 'Olivia Rhye', '01/04/2025, 3:52 PM EST', [L('Initial document was created.')])] },
      { id: 'cd5', org: '1800', type: 'E-Note Template', desc: 'This document was active as of January 2025.', ext: 'pdf', fileName: 'harvard-enote-template-2025.pdf', size: 498000, status: 'deleted', who: 'Olivia Rhye', when: '01/10/2026, 3:52 PM EST',
        events: [ev('Deleted', 'Olivia Rhye', '01/10/2026, 3:52 PM EST', [L('Document was deleted.')]), ev('Uploaded', 'Olivia Rhye', '01/06/2025, 10:12 AM EST', [L('Initial document was created.')])] },
      { id: 'cd6', org: '1801', type: 'E-Note Template', desc: 'E-Note layout for the Graduate School of Design.', ext: 'pdf', fileName: 'gsd-enote-template.pdf', size: 420000, status: 'active', who: 'Mateo Rodriguez', when: '02/14/2026, 10:05 AM EST',
        events: [ev('Uploaded', 'Mateo Rodriguez', '02/14/2026, 10:05 AM EST', [L('Initial document was created.')])] },
      { id: 'cd7', org: '2400', type: 'Sample Spreadsheet', desc: 'Template for spring 2026 conferral data.', ext: 'xlsx', fileName: 'vhu-sample-spreadsheet.xlsx', size: 180000, status: 'active', who: 'Isabella Garcia', when: '03/02/2026, 1:20 PM EST',
        events: [ev('Uploaded', 'Isabella Garcia', '03/02/2026, 1:20 PM EST', [L('Initial document was created.')])] },
      { id: 'cd8', org: '2400', type: 'Email Authorization', desc: 'Approved sender list for credential emails.', ext: 'png', fileName: 'vhu-email-authorization.png', size: 88000, status: 'active', who: 'Isabella Garcia', when: '03/02/2026, 1:24 PM EST',
        events: [ev('Uploaded', 'Isabella Garcia', '03/02/2026, 1:24 PM EST', [L('Initial document was created.')])] },
];

const H = (id: string, section: HelpfulDoc['section'], name: string, who: string, when: string): HelpfulDoc => ({ id, section, name, who, when, ext: 'pdf', fileName: name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.pdf', size: 350000 });
export const SEED_HELPFUL_DOCS: HelpfulDoc[] = [
      H('hd1', 'general', 'Artwork Submission Guidelines', 'Isabella Garcia', '03/05/2025, 2:22 PM EST'),
      H('hd2', 'general', 'Digital Credential Aftercare', 'Mateo Rodriguez', '11/22/2024, 9:01 AM EST'),
      H('hd3', 'shipping', 'Address Submission', 'Sofia Dubois', '07/14/2023, 6:37 PM EST'),
      H('hd4', 'shipping', 'Address Submission Tips', 'Jackson Moreau', '02/01/2026, 1:11 AM EST'),
      H('hd5', 'shipping', 'Delivery and Shipping Guidelines', 'Aaliyah Bernard', '09/28/2024, 10:45 AM EST'),
      H('hd6', 'shipping', 'eNotes Info', 'Ethan Leclerc', '04/06/2026, 7:59 PM EST'),
      H('hd7', 'shipping', 'Mail Carrier Standards', 'Chloe Nguyen', '08/19/2023, 4:14 PM EST'),
      H('hd8', 'shipping', 'Premium Service Fee Chart', 'Gabriel Fournier', '06/11/2025, 12:03 AM EST'),
      H('hd9', 'signatures', 'New Signature Upload Replacement Request Form', 'Noah Roy', '05/02/2024, 3:52 PM EST'),
      H('hd10', 'signatures', 'Punctuation Accent Codes', 'Amelia Dubois', '10/25/2025, 8:28 AM EST'),
      H('hd11', 'signatures', 'Signatures Guidelines', 'William Landry', '07/30/2023, 5:05 PM EST'),
      H('hd12', 'signatures', 'Signatory Title or School Name Change Request Form', 'Mia Cote', '12/08/2025, 11:36 AM EST'),
];

export const FAQ: [string, [string, string][]][] = [
      ['General', [['What is Credential Connections?', 'Credential Connections is Paradigm’s platform for ordering and managing diplomas, certificates, digital credentials, signatures and client documents in one place.'],
        ['Who can use Credential Connections?', 'Registrar and records staff at partner institutions. Your organization’s administrator can add users from the Users page.']]],
      ['Ordering & Delivery', [['Where do I submit orders?', 'Go to Orders and select New order. You can also upload a batch file from the same page.'],
        ['How do I know if my order was received?', 'Every submitted order appears under Orders with its status. You also get a confirmation email.'],
        ['Can I change or cancel an order after submitting?', 'Yes, until the order moves into production. Open the order and choose Edit or Cancel.'],
        ['How do I request a rush order?', 'Choose an expedited service type (1-day, 3-day or 5-day) when you place or release the order. Fees follow your contract.'],
        ['Can I order multiple copies of a diploma?', 'Yes. Set the quantity for each learner when you build the order.'],
        ['What if a student has a hold?', 'Records with a hold appear in Hold Management. Release them there when the hold is cleared and they are batched per your schedule.'],
        ['How are orders shipped?', 'Orders ship with the carrier and service selected on the order. Tracking is added once the shipment leaves production.'],
        ['Can I view tracking for orders shipped?', 'Yes. Open the order to see tracking numbers for each shipment.'],
        ['How quickly will credentials ship?', 'Standard orders ship on your contracted schedule. Expedited service types ship sooner.'],
        ['Will students be notified when credentials are shipped?', 'If learner notifications are turned on for your organization, students receive an email when their order ships.'],
        ['What if diplomas are lost or damaged during shipping?', 'Students can request a reorder. Reorders appear in Reorder Management for your approval.'],
        ['How are addresses validated?', 'Addresses are checked against carrier data when they are entered. Problems are flagged before the order is produced.'],
        ['What happens to undeliverable shipments?', 'Returned shipments are held and your team is notified so the address can be corrected.']]],
      ['Security & Compliance', [['How does Paradigm protect data?', 'Data is encrypted in transit and at rest, and access is limited to authorized users in your organization.'],
        ['How are signatures protected?', 'Signature files are stored securely and only used for credentials your organization approves.']]],
      ['Technical & Implementation', [['How difficult is it to use Credential Connections?', 'Most teams are up and running after onboarding. The Helpful documents section has guides for each task.'],
        ['Can I add or change credentials?', 'Contact the Client Relations Team to add a credential or change an existing template.'],
        ['What does the onboarding process include?', 'Account setup, template review, signature collection and a walkthrough of ordering.'],
        ['What is required for implementation?', 'Your credential templates, signatures, shipping preferences and the users who need access.']]],
      ['Pricing & Payment', [['How much do services cost?', 'Pricing follows your organization’s contract. Ask the Client Relations Team for your current fee schedule.'],
        ['How are digital credentials billed?', 'Digital credentials are billed per your contract, separately from paper orders.'],
        ['When am I invoiced?', 'Invoices follow the billing schedule in your contract.']]],
      ['Support', [['Who do I contact for support?', 'The Client Relations Team. Use Get in touch at the bottom of this page.']]],
      ['Future Roadmap', [['What enhancements are planned for Credential Connections?', 'The roadmap is shared with partners during regular check-ins with the Client Relations Team.'],
        ['What transcript experience will Credential Connections provide?', 'Transcript support is on the roadmap. Details will be shared as it gets closer.'],
        ['How will Comprehensive Learner Records (CLRs) fit into the platform?', 'CLRs are planned to sit alongside digital credentials in the same platform.'],
        ['How does Paradigm approach innovation?', 'New features are shaped with partner feedback and released gradually.']]],
];
