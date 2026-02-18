# TRES FinOS Monorepo

PRD-driven implementation workspace for TRES FinOS (Web3 finance operations platform).

This README is written as a handoff guide so a new engineer can continue development quickly.

## 1) What Is Live Today

- Web app (Cloudflare Pages): `https://tres-finos.pages.dev`
- API (Cloudflare Worker): `https://tres-finos-api.chameleon-finance.workers.dev`
- D1 database: `tres-finos-db`

Current product surface includes:
- Overview dashboard and KPI cards
- Net worth trend, network exposure, and recent activity views
- Wallet and transaction operations
- Accounts workspace (contacts, custodians, unidentified addresses)
- Assets inventory + history endpoint
- Positions management
- Payments AP/AR (invoices and bills)
- Reconciliation runs (manual + auto-run)
- Reporting (create + run + publish)
- Alerts and automation rules
- Cost basis calculation
- Team/RBAC basics
- Webhooks and test events
- ERP connection + sync scaffolding
- Xero and QuickBooks integration profiles
- Frameworks workspace (1099 active + framework catalog placeholders)

## 2) Product References

- PRD: `TRES Finance PRD.md`
- Delivery plan: `TRES Finance Development Plan.md`
- UX/UI blueprint: `UXUI Blueprint.md`
- Cloudflare runbook: `cloudflare/DEPLOYMENT.md`

## 3) Monorepo Structure

```text
apps/
  api/                    # NestJS scaffold (local baseline, not production API)
  web/                    # Next.js frontend (deployed to Cloudflare Pages)
cloudflare/
  api-worker/             # Production API (Cloudflare Worker + D1 schema)
tests/e2e/                # Playwright e2e tests
```

Important:
- The active production backend is `cloudflare/api-worker`.
- `apps/api` exists for local/service scaffolding and Prisma workflow, but is not the deployed API.

## 4) Prerequisites

- Node.js `>=24 <26`
- npm `>=11`
- Docker Desktop (for local infra)
- Cloudflare Wrangler CLI access (`npx wrangler ...`)
- GitHub access to `KunanonJ/tres-finos`

## 5) First-Time Setup

```bash
cp .env.example .env
npm install
docker compose up -d
npm run db:generate
```

Then start local apps:

```bash
npm run dev
```

## 6) Environment Variables

See `.env.example`:

```env
# Shared
NODE_ENV=development

# API
API_PORT=3001
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tres_finos
REDIS_URL=redis://localhost:6379

# Web
NEXT_PUBLIC_API_URL=http://localhost:3001
```

For cloud-backed frontend testing, set:

```env
NEXT_PUBLIC_API_URL=https://tres-finos-api.chameleon-finance.workers.dev
```

## 7) Daily Development Workflow

### A. Backend feature (production path)

1. Edit Worker routes/logic: `cloudflare/api-worker/src/index.ts`
2. Update D1 schema if needed: `cloudflare/api-worker/schema.sql`
3. Apply schema locally and/or remotely
4. Deploy Worker

### B. Frontend feature

1. Edit UI in `apps/web/app/page.tsx` and styles in `apps/web/app/globals.css`
2. Validate with lint/build
3. Deploy Pages

### C. Docs

Update:
- `README.md` for developer-facing changes
- `cloudflare/DEPLOYMENT.md` for infra/API surface changes

## 8) Commands You Will Use Most

### Dev and quality

```bash
npm run dev
npm run lint
npm run build
npm run test
npm run test:e2e
```

### Database (local Nest/Prisma baseline)

```bash
npm run db:generate
npm run db:migrate
```

### Cloudflare deploy

```bash
npm run deploy:api:cf
npm run deploy:web:cf
npm run deploy:cf
```

### Apply D1 schema directly

Remote:
```bash
CLOUDFLARE_ACCOUNT_ID=<your_account_id> \
  npx wrangler d1 execute tres-finos-db --remote --file cloudflare/api-worker/schema.sql
```

Local (worker config):
```bash
npx wrangler d1 execute tres-finos-db \
  --config cloudflare/api-worker/wrangler.toml \
  --file cloudflare/api-worker/schema.sql
```

## 9) Production API Surface (Worker)

### Core
- `GET /health`
- `GET /v1`

### Organizations and Access
- `GET/POST/PATCH /v1/organizations`
- `GET/POST /v1/team-members`
- `PATCH /v1/team-members/:id`

### Treasury and Ledger
- `GET /v1/dashboard/summary`
- `GET /v1/dashboard/top-assets`
- `GET/POST/PATCH /v1/wallets`
- `GET/POST /v1/transactions`
- `POST /v1/transactions/bulk`
- `GET /v1/transactions/export`
- `GET/POST /v1/transactions/:id/notes`
- `GET/POST /v1/transactions/:id/splits`
- `GET/POST /v1/transaction-groups`
- `POST /v1/cost-basis/calculate`

### Reconciliation and Reports
- `GET/POST/PATCH /v1/reconciliations`
- `POST /v1/reconciliations/auto-run`
- `GET/POST /v1/reports`
- `GET /v1/reports/published`
- `GET /v1/reports/:id`
- `POST /v1/reports/:id/run`
- `POST /v1/reports/:id/publish`

### Accounts, Assets, Positions, Payments
- `GET/POST /v1/accounts/contacts`
- `PATCH /v1/accounts/contacts/:id`
- `GET/POST /v1/accounts/custodians`
- `PATCH /v1/accounts/custodians/:id`
- `GET/POST /v1/accounts/unidentified-addresses`
- `PATCH /v1/accounts/unidentified-addresses/:id`
- `GET /v1/assets`
- `GET /v1/assets/:symbol/history`
- `GET/POST /v1/positions`
- `PATCH /v1/positions/:id`
- `GET/POST /v1/payments/invoices`
- `PATCH /v1/payments/invoices/:id`
- `GET/POST /v1/payments/bills`
- `PATCH /v1/payments/bills/:id`

### Automation and Integrations
- `GET/POST/PATCH /v1/alerts`
- `GET/POST/PATCH /v1/rules`
- `GET/POST /v1/webhooks`
- `PATCH /v1/webhooks/:id`
- `GET /v1/webhooks/:id/events`
- `POST /v1/webhooks/:id/test`
- `GET/POST /v1/integrations/erp`
- `POST /v1/integrations/erp/:id/sync`
- `GET/POST /v1/integrations/xero`
- `PATCH /v1/integrations/xero/:id`
- `GET/POST /v1/integrations/quickbooks`
- `PATCH /v1/integrations/quickbooks/:id`
- `GET /v1/frameworks/catalog`
- `GET/POST /v1/frameworks/1099`
- `PATCH /v1/frameworks/1099/:id`

## 10) Deployment Runbook (Safe Sequence)

1. Lint/build first:
   - `npm run lint`
   - `npm run build`
2. If schema changed, apply D1 schema remotely.
3. Deploy API Worker.
4. Build/deploy web.
5. Smoke check:
   - open `https://tres-finos.pages.dev`
   - verify API health badge updates to connected
6. Push code and note deployed URLs in commit/PR notes.

## 11) Known Caveats

- Pages deploy may occasionally return a temporary internal error on first try; rerun deploy.
- In restricted environments, DNS resolution for `workers.dev` domains can fail (`ENOTFOUND`), which may break API tests even when deployment is correct.
- `next lint` is currently used and prints a deprecation warning for Next.js 16 migration.

## 12) How To Continue Seamlessly (Suggested Next Milestones)

1. Split monolithic Worker routes into modules (`routes/`, `services/`, `repositories/`) for maintainability.
2. Add auth + tenant isolation middleware (JWT/session + org scoping).
3. Expand reconciliation matching logic beyond status-based heuristics.
4. Add persistent job execution for long-running report generation.
5. Add API contract tests and deterministic seed fixtures for e2e.
6. Implement dedicated pages/routes in web app beyond single-page console.

## 13) UX/UI Notes

- Design source of truth for current visual direction: `UXUI Blueprint.md`
- Implemented UI mapping:
  - Shell/navigation/modules: `apps/web/app/page.tsx`
  - Design tokens/background/motion: `apps/web/app/globals.css`

## 14) AI Handover (GitHub Continuation)

This section is optimized for the next AI coding agent to continue delivery with minimal context loss.

### A. Snapshot (as of February 18, 2026)

- Default branch: `main`
- Remote: `https://github.com/KunanonJ/tres-finos.git`
- Latest integration commit for expanded PRD scope: `267a207`
- Production API deployed and validated:
  - `https://tres-finos-api.chameleon-finance.workers.dev`
  - Worker includes compatibility fallbacks for legacy D1 column drift.
- D1 schema was applied remotely from:
  - `cloudflare/api-worker/schema.sql`
- E2E status:
  - `6/6` Playwright smoke tests passing via `tests/e2e/smoke.spec.ts`

### B. Current Production Gap

- API is current.
- Web Pages runtime may still serve an older static build if `apps/web/out` is stale.
- If this happens, rebuild and redeploy web immediately (see section C).

### C. Resume Commands (strict order)

```bash
# 1) Ensure dependencies
npm install

# 2) Rebuild web static output
npm run build -w @tres/web -- --no-lint

# 3) Deploy API (idempotent)
CLOUDFLARE_ACCOUNT_ID=<account_id> \
  npx wrangler deploy --config cloudflare/api-worker/wrangler.toml

# 4) Apply latest D1 schema (idempotent)
CLOUDFLARE_ACCOUNT_ID=<account_id> \
  npx wrangler d1 execute tres-finos-db --remote --file cloudflare/api-worker/schema.sql

# 5) Deploy web static output
CLOUDFLARE_ACCOUNT_ID=<account_id> \
  npx wrangler pages deploy apps/web/out --project-name=tres-finos --branch=main --commit-dirty=true

# 6) Validate
npm run test:e2e
```

### D. Verification Checklist

1. `GET /health` returns 200 from production Worker.
2. `GET /v1` returns API version/stage.
3. UI nav includes new PRD modules: Accounts, Assets, Positions, Payments, Integrations, Frameworks.
4. API routes for reports publish + frameworks + Xero/QuickBooks return 2xx.
5. Playwright smoke tests pass locally against production API.

### E. If Build/Deploy Is Blocked

- If `next build` stalls with no output:
  - run with `CI=1 NEXT_TELEMETRY_DISABLED=1`
  - retry in a fresh shell/session
  - avoid parallel `next build` processes
- If Wrangler auth/network fails:
  - set `CLOUDFLARE_API_TOKEN`
  - verify DNS can resolve `api.cloudflare.com` and `dash.cloudflare.com`

### F. High-Value Next Tasks

1. Split `cloudflare/api-worker/src/index.ts` into modular route/service files.
2. Add authentication + strict org-level authorization.
3. Replace fallback compatibility paths once production D1 is fully normalized.
4. Break `apps/web/app/page.tsx` into route-level pages/components.
5. Add API contract tests for each module endpoint.

---

If you are onboarding a new engineer, ask them to run sections **5, 8, and 10** first.
