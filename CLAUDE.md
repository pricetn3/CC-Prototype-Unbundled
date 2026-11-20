# CC Platform (React)

The coded version of the Credential Connections platform prototype. The owner is a designer, not a developer: explain things in plain language and show changes in the browser before committing.

## Where the design comes from

- **Screens:** the Claude Design canvas "CC Platform External prototype" is the source of truth. Links and the last-synced version are in `design/design-sync.json`.
- **Look:** the [CC Design System](https://github.com/pricetn3/CC-Design-System), checked out at `~/Documents/GitHub/CC-Design-System`. Its master is the Credential Connections Design System in Claude Design.

Design changes start in Claude Design, never only here. To bring them over, use the `sync-design` skill (the owner says "sync from design"). It diffs the canvas against `design/snapshot/` and ports only what changed.

## How the design system is wired

`index.html` loads `tokens.css` and `components.css` from `https://pricetn3.github.io/CC-Design-System/`. Token values and `cc-*` component styles update here on the next page load after the owner pushes the design system repo, with no rebuild. Renamed or removed tokens or classes, and changes to a component's markup, need a code change here (a sync covers that).

This repo is registered under `codebases` in the design system's `prototypes.json`, so `python3 tools/drift_check.py` (run in that repo) checks it.

## Conventions

- React 18, TypeScript, Vite, React Router. Run with `npm run dev` (port 5173).
- Use the design system's `cc-*` classes for controls (buttons, inputs, badges, tabs, dropdowns, filter bar, dialogs, toasts, checkboxes, radios, links) before writing new styles.
- Layout styles go in a CSS Module beside the component. Use tokens (`var(--blue-600)`, `var(--space-4)`, `var(--radius-md)`) for every color, size, space, radius and shadow. Never hard-code a hex color.
- Icons: `lucide-react`, matching the Lucide names in the design markup. Decorative icons get `aria-hidden="true"`.
- Shared pieces live in `src/components/` and mirror the canvas's shared components (`CCTable`, `SegTabs`). Reuse them.
- Copy is terse, sentence case, with verbs leading button labels. No exclamation marks, no emoji.
- Sample data lives in `src/data/` and matches the prototype's seed data. Users are fictional.

## Accessibility

Everything meets WCAG 2.2 AA, the design system's standard: 4.5:1 text contrast, visible focus on every control, 24px minimum targets, status never shown by color alone, and layouts that reflow at 320px. When something doesn't meet it, tell the owner in plain language with the criterion number.

## Publishing

Commit on a branch and never push. The owner pushes with GitHub Desktop. When a change touches the design system repo too, that repo is pushed first.
