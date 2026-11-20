# Credential Connections platform (Internal view)

A React rebuild of the Internal CC Platform prototype from Claude Design (canvas "CC Platform External prototype"). It uses the [CC Design System](https://github.com/pricetn3/CC-Design-System): `tokens.css` and `components.css` load from the published site in `index.html`, so a token change pushed there shows up here too.

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:5173.

## What's built

| Screen | Route | Status |
|---|---|---|
| Home | `/` | Built: metric cards, recent organizations, quick actions |
| Organizations | `/organizations` | Built: search, filter bar (Organization, Shipping, Billing, Punctuation, Show Inactive), setup columns |
| Organization profile | `/organizations/:id` | Details tab built: edit with validation, setup status, settings summary, deactivate / reactivate. Other tabs say "not built yet" |
| Admin | `/admin`, `/admin?tab=action-log` | Built: Countries (edit, save, sort, search, unsaved-changes prompt) and Action log (search, filters, date range, long-value dialog) |
| Users, Reports, Orders and its sub-pages, Signatures, Documents | in the side nav | Placeholder pages |

Data is in memory (`src/data/`) and resets on reload. Org IDs, names and the action log match the prototype's sample data.

## Structure

- `src/layout/`: app shell, sidebar (270px, collapses to 64px at 1280px wide or less), top bar
- `src/components/`: shared pieces matching the prototype's components: `SegTabs`, `CCTable`, `SearchField`, `FilterDropdown`, `Dialog`, `Toast`, `StatusIcon`, `PageHeader`
- `src/pages/`: one file per screen, each with a CSS Module for layout. Colors, type and spacing come from the design system tokens, and controls use its `cc-*` classes.

Everything aims at WCAG 2.2 AA, the design system's standard.

## Keeping it in sync with the design

- **Design system:** token values and `cc-*` component styles update here on their own after you push the design system repo. Renamed tokens or classes need a sync.
- **Claude Design canvas:** after changing the prototype, open Claude Code in this repo and say **"sync from design"**. The `sync-design` skill (`.claude/skills/sync-design/`) compares the canvas with `design/snapshot/`, ports what changed, checks it in the browser and commits it to a branch.

`design/design-sync.json` records which canvas version was last synced and which screens are built.

## Links for user stories

Each story can link three things: the prototype deep link (Claude Design), the screen in this app, and the code file below. Code links point at the latest `main`. To pin a story to the code as it is today, open the file on GitHub and press `y`; the address changes to a fixed commit link.

Run the app with `npm run dev`, then add the path to `http://localhost:5173`.

| Screen | Path in the app | Code |
| --- | --- | --- |
| App shell (top bar, layout) | all screens | [AppShell.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/layout/AppShell.tsx), [TopBar.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/layout/TopBar.tsx) |
| Side rail (prototype only, to be removed) | all screens | [Sidebar.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/layout/Sidebar.tsx) |
| Home | `/` | [Home.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/Home.tsx) |
| Organizations | `/organizations` | [Organizations.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/Organizations.tsx) |
| Add organization | `/organizations/new` | [AddOrganization.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/AddOrganization.tsx) |
| Org profile, Details | `/organizations/:num` | [OrgProfile.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/OrgProfile.tsx) |
| Org profile, other tabs | `/organizations/:num?tab=shipping`, `billing`, `contacts`, `punctuation`, `settings` | [org-profile/](https://github.com/pricetn3/CC-Prototype-Unbundled/tree/main/src/pages/org-profile) |
| Org profile, one settings section | `/organizations/:num?tab=settings&section=` `batching`, `digital`, `hold`, `lost-damaged`, `paper-authentication`, `reorder` or `paper` | [SettingsTab.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/org-profile/SettingsTab.tsx) |
| Admin, Countries | `/admin` | [Admin.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/Admin.tsx), [AdminCountries.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/AdminCountries.tsx) |
| Admin, Action log | `/admin?tab=action-log` | [AdminActionLog.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/AdminActionLog.tsx) |
| Users | `/users` | [Users.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/Users.tsx) |
| Invite user | `/users/invite` | [UsersDialogs.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/components/UsersDialogs.tsx) |
| Edit user | `/users/:userId?edit=1` | [Users.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/Users.tsx) |
| Profile | `/profile` | [Profile.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/Profile.tsx) |
| Reports | `/reports` | [Reports.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/Reports.tsx) |
| Orders | `/orders`, one order: `/orders?order=<id>` | [Orders.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/Orders.tsx) |
| Place order | `/orders/new` | [PlaceOrder.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/PlaceOrder.tsx) |
| Credentials | `/orders/credentials?tab=paper` or `digital` | [Credentials.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/Credentials.tsx) |
| Reorder management | `/orders/reorders` | [Reorders.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/Reorders.tsx) |
| Hold management | `/orders/holds` | [Holds.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/Holds.tsx) |
| Signatures | `/signatures` | [Signatures.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/Signatures.tsx) |
| Documents | `/documents` | [Documents.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/Documents.tsx) |
| Support | `/support` | [Support.tsx](https://github.com/pricetn3/CC-Prototype-Unbundled/blob/main/src/pages/Support.tsx) |
| Shared components | | [components/](https://github.com/pricetn3/CC-Prototype-Unbundled/tree/main/src/components) |
| Sample data | | [data/](https://github.com/pricetn3/CC-Prototype-Unbundled/tree/main/src/data) |
