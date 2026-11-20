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
