# Cloudflare Deployment Notes

## Live Resources
- Pages project: `tres-finos`
- Pages URL: `https://tres-finos.pages.dev`
- API Worker: `tres-finos-api`
- API URL: `https://tres-finos-api.chameleon-finance.workers.dev`
- D1 Database: `tres-finos-db`

## Deployed Backend Shape
The Cloudflare API worker currently exposes:
- `GET /health`
- `GET /v1`
- `GET/POST/PATCH /v1/organizations`
- `GET/POST /v1/team-members`
- `PATCH /v1/team-members/:id`
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
- `GET/POST/PATCH /v1/reconciliations`
- `POST /v1/reconciliations/auto-run`
- `GET/POST /v1/reports`
- `GET /v1/reports/:id`
- `POST /v1/reports/:id/run`
- `GET/POST/PATCH /v1/alerts`
- `GET/POST/PATCH /v1/rules`
- `GET/POST /v1/webhooks`
- `PATCH /v1/webhooks/:id`
- `GET /v1/webhooks/:id/events`
- `POST /v1/webhooks/:id/test`
- `GET/POST /v1/integrations/erp`
- `POST /v1/integrations/erp/:id/sync`

## Redeploy Commands
From repo root:

```bash
npm run deploy:api:cf
npm run deploy:web:cf
# or both
npm run deploy:cf
```

## D1 Schema Management
Apply schema updates:

```bash
CLOUDFLARE_ACCOUNT_ID=<your_account_id> \
  npx wrangler d1 execute tres-finos-db --remote --file cloudflare/api-worker/schema.sql
```

## Custom Domain (Pages)
This Wrangler version does not support custom-domain operations for Pages directly.
Use Cloudflare Dashboard:

1. Go to **Workers & Pages** -> **tres-finos**.
2. Open **Custom domains**.
3. Add your desired domain/subdomain.
4. Confirm DNS records (Cloudflare will provide required records).

After DNS propagates, your custom domain will point to the Pages deployment.
