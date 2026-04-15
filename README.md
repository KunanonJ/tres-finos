# Tres Finos CFO Console

This monorepo also ships other services (for example API and infrastructure). The sections below describe the **CFO dashboard** in [`apps/web`](apps/web/).

Local-first finance dashboard for reviewing cash, P&L, and transactions. Built with **Next.js 16** (App Router), **React 19**, **TypeScript**, and **Tailwind CSS**.

## Features

- **Overview** — Balance, revenue, expenses, net cash, runway; revenue vs expense chart; insights; balance trajectory and drill-downs into transactions.
- **Monthly P&L & categories** — Sticky tables with navigation into the transaction explorer.
- **Transactions** — Filter by month, direction, search, and category; pagination; URL-synced filters.
- **Period scope** — Full quarter or a single month; optional **month-vs-month compare** (Overview).
- **Bank statements** — Upload **PDF** or **CSV** per month (browser-only storage) to override the built-in ledger for that month; **import preview** before saving.
- **Data tools** — Export filtered transactions as CSV, **JSON backup / restore** for uploads, print-friendly report.
- **Command palette** — `⌘K` / `Ctrl+K` to jump tabs, scope, compare, or focus transaction search.
- **Onboarding** — Dismissible welcome checklist (stored in the browser).
- **Theme** — Light / dark with persistence and reduced motion–aware UI.

## Requirements

- **Node.js** 20+ (recommended; matches `pdfjs-dist` engines)
- **npm** 9+

## Setup

From the repository root:

```bash
npm install
```

Copy environment variables for the web app (optional; defaults work for local dev on port 3000):

```bash
cp apps/web/.env.example apps/web/.env
```

Optional env vars are documented in `apps/web/.env.example`. Local dev serves at `/` without a base path.

## Scripts

| Command        | Description                                      |
|----------------|--------------------------------------------------|
| `npm run dev`  | Start Next.js dev server (`apps/web`, Turbopack) |
| `npm run build`| Production build                                  |
| `npm run lint` | ESLint + project rule checks                     |

Dev server: [http://localhost:3000](http://localhost:3000) (default).

## Project layout

```text
apps/web/
  app/              # App Router: pages and layout (static export; no server routes)
  components/       # UI and dashboard panels
  hooks/            # Client hooks (e.g. merged ledger data)
  lib/              # Dashboard engine, CSV/PDF ingest, URL state, backups
  types/            # Shared TypeScript types
```

Ledger data ships as CSV under `apps/web/lib/data/`; the dashboard engine aggregates metrics and insights from those transactions. The UI loads and filters data entirely in the browser.

## License

Private / all rights reserved unless otherwise specified by the repository owner.
