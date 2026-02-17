# TRES FinOS Monorepo

PRD-driven implementation workspace for TRES FinOS.

## Apps
- `@tres/web`: Next.js frontend operations console
- `@tres/api`: NestJS API scaffold (local service baseline)
- `cloudflare/api-worker`: Cloudflare Worker API (active deployed backend)

## Infrastructure (local)
- PostgreSQL
- Redis
- Kafka
- Temporal

## Quick Start
1. Copy env:
   - `cp .env.example .env`
2. Start local infra:
   - `docker compose up -d`
3. Install dependencies:
   - `npm install`
4. Generate Prisma client:
   - `npm run db:generate`
5. Run apps:
   - `npm run dev`

## Cloudflare Deploy
- Deploy Worker API:
  - `npm run deploy:api:cf`
- Deploy Web app to Pages:
  - `npm run deploy:web:cf`
- Deploy both:
  - `npm run deploy:cf`

## Implemented API Surface (Cloudflare Worker)
- API Health: `GET /health`
- API Version: `GET /v1`
- Organizations: `GET/POST/PATCH /v1/organizations`
- Team/RBAC: `GET/POST /v1/team-members`, `PATCH /v1/team-members/:id`
- Dashboard: `GET /v1/dashboard/summary`, `GET /v1/dashboard/top-assets`
- Wallets: `GET/POST/PATCH /v1/wallets`
- Transactions: `GET/POST /v1/transactions`, `POST /v1/transactions/bulk`, `GET /v1/transactions/export`
- Transaction collaboration: `GET/POST /v1/transactions/:id/notes`
- Transaction splitting: `GET/POST /v1/transactions/:id/splits`
- Transaction grouping: `GET/POST /v1/transaction-groups`
- Cost basis: `POST /v1/cost-basis/calculate`
- Reconciliation: `GET/POST/PATCH /v1/reconciliations`, `POST /v1/reconciliations/auto-run`
- Reports: `GET/POST /v1/reports`, `GET /v1/reports/:id`, `POST /v1/reports/:id/run`
- Alerts: `GET/POST/PATCH /v1/alerts`
- Rules: `GET/POST/PATCH /v1/rules`
- Webhooks: `GET/POST /v1/webhooks`, `PATCH /v1/webhooks/:id`, `GET /v1/webhooks/:id/events`, `POST /v1/webhooks/:id/test`
- ERP Integrations: `GET/POST /v1/integrations/erp`, `POST /v1/integrations/erp/:id/sync`

## Notes
The platform now includes end-to-end implementation for core PRD modules:
ledger, dashboard summary, reconciliation, reporting, alerts/rules automation,
cost-basis workflows, RBAC collaboration, webhook routing, and ERP sync scaffolding.

UX/UI design blueprint reference:
- `UXUI Blueprint.md`
