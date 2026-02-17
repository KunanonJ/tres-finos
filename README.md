# TRES FinOS Monorepo

Initial platform scaffold for TRES FinOS.

## Apps
- `@tres/web`: Next.js frontend (dashboard shell)
- `@tres/api`: NestJS backend API + Prisma

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

## Initial Endpoints
- API Health: `GET /health`
- API Version: `GET /v1`

## Notes
This is Phase 0 foundation scaffolding. Feature modules (ledger, reconciliation, reporting) will be added incrementally.
