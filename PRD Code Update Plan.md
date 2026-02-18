# PRD Code Update Plan (After PRD Refresh)

## 1) Review Summary

Updated PRD source: `/Users/kunanonjarat/Desktop/Finance Platform/TRES Finance PRD.md`

Key changes in the new PRD:
- PRD is now concise and feature-module based (Dashboard, Ledger, Accounts, Assets, Positions, Payments, Reports, Integrations, Automations, Alerts, Frameworks).
- Scope emphasizes end-user workflows and operational modules instead of deep architecture details.
- New explicit product modules to implement in code:
  - Accounts (`3.3`)
  - Assets (`3.4`)
  - Positions (`3.5`)
  - Payments AP/AR (`3.6`)
  - Frameworks (`3.11`)

Current implementation baseline:
- Already implemented well: dashboard core, ledger core, reconciliations, reports baseline, alerts, rules automations, team basics, webhooks, ERP connector baseline.
- Missing/partial vs updated PRD:
  - Accounts: contacts, custodians, unidentified addresses, account-level reconciliation views.
  - Assets: dedicated assets inventory pages and archived balances view.
  - Positions: dedicated positions model and UI.
  - Payments: invoices/bills/AP-AR workflows.
  - Reports: report publishing and classification metadata.
  - Integrations: explicit Xero/QuickBooks integration states (currently generic ERP connector).
  - Frameworks: 1099 + compliance framework workspace (with placeholders for coming-soon frameworks).

## 2) Gap Matrix (PRD vs Code)

| PRD Module | Status | Notes |
| :--- | :--- | :--- |
| Dashboard (`3.1`) | Partial | KPI + top assets + wallets exist; missing richer widgets (net worth over time, recent activity feed details, network exposure chart). |
| Ledger (`3.2`) | Partial | Transaction list/filter/export exists; AI search, pivot tables, and explicit data tabs are not implemented. |
| Accounts (`3.3`) | Missing/Partial | Wallets exist; contacts/custodians/unidentified addresses are missing. |
| Assets (`3.4`) | Partial | Top-assets summary exists; dedicated assets inventory module is missing. |
| Positions (`3.5`) | Missing | No explicit positions backend or UI module. |
| Payments (`3.6`) | Missing | AP/AR invoice and bill workflows not implemented. |
| Reports (`3.7`) | Partial | Generate/run exists; publish/search/classification missing. |
| Integrations (`3.8`) | Partial | Generic ERP integration exists; explicit Xero/QuickBooks profiles + status views needed. |
| Automations (`3.9`) | Partial | Rules and webhooks exist; workflow orchestration dashboard can be improved. |
| Alerts (`3.10`) | Implemented (baseline) | Create/manage alert flows already present; can extend event catalog. |
| Frameworks (`3.11`) | Missing | 1099 + framework workspace not implemented yet. |

## 3) Implementation Plan (Phased)

## Phase A: Data Model and API Expansion (Foundation)
Goal: Add missing backend entities and routes for new PRD modules.

### A1. Database schema updates (Cloudflare D1)
Files:
- `/Users/kunanonjarat/Desktop/Finance Platform/cloudflare/api-worker/schema.sql`

Add tables:
- `contacts`
- `custodians`
- `unidentified_addresses`
- `assets_snapshots` (or `asset_balances`)
- `positions`
- `invoices`
- `bills`
- `payment_events`
- `report_publications`
- `framework_cases`

### A2. Worker endpoints
Files:
- `/Users/kunanonjarat/Desktop/Finance Platform/cloudflare/api-worker/src/index.ts`

Add routes:
- Accounts:
  - `GET/POST/PATCH /v1/accounts/contacts`
  - `GET/POST/PATCH /v1/accounts/custodians`
  - `GET/POST/PATCH /v1/accounts/unidentified-addresses`
- Assets:
  - `GET /v1/assets`
  - `GET /v1/assets/:symbol/history`
- Positions:
  - `GET/POST/PATCH /v1/positions`
- Payments:
  - `GET/POST/PATCH /v1/payments/invoices`
  - `GET/POST/PATCH /v1/payments/bills`
- Reports:
  - `POST /v1/reports/:id/publish`
  - `GET /v1/reports/published`
- Integrations:
  - `GET/POST/PATCH /v1/integrations/xero`
  - `GET/POST/PATCH /v1/integrations/quickbooks`
- Frameworks:
  - `GET/POST/PATCH /v1/frameworks/1099`
  - `GET /v1/frameworks/catalog`

Acceptance:
- All new routes available under `/v1`.
- DB constraints and indexes support list/filter performance.

## Phase B: Frontend Module Buildout
Goal: Expose all PRD modules in the UI shell with functional CRUD flows.

### B1. Navigation and module structure
Files:
- `/Users/kunanonjarat/Desktop/Finance Platform/apps/web/app/page.tsx`
- `/Users/kunanonjarat/Desktop/Finance Platform/apps/web/app/globals.css`

Add sections:
- Accounts
- Assets
- Positions
- Payments (AP/AR)
- Frameworks

### B2. Accounts UI
Implement:
- Contact management table/form
- Custodian management table/form
- Unidentified address labeling queue

### B3. Assets and Positions UI
Implement:
- Assets inventory grid with network filters
- Archived balances chart/table
- Positions list with zero-balance toggle and reconciliation status

### B4. Payments UI
Implement:
- Invoice list/create/update
- Bills list/create/update
- Status filtering and ERP refresh action

### B5. Reports + Integrations + Frameworks UI enhancements
Implement:
- Report publish action + published list
- Xero/QuickBooks connection status cards
- Frameworks board (1099 active, others marked coming soon)

Acceptance:
- New sections accessible from top navigation.
- End-to-end form actions call new API routes successfully.

## Phase C: Ledger and Dashboard Enhancements
Goal: Close remaining partial gaps in existing modules.

### C1. Dashboard enrichments
Implement:
- Net worth over time chart (client-side series from transactions/assets snapshots)
- Recent activity feed enhancement
- Network exposure chart/table

### C2. Ledger enhancements
Implement:
- Data tabs: Transaction, Cost Basis, Roll Forward, Trial Balance (baseline views)
- Advanced search presets
- Pivot-style grouped summaries (server-side grouped queries)

Acceptance:
- Dashboard and Ledger align with PRD tables (`3.1`, `3.2`) at baseline level.

## Phase D: Quality, Security, and Release Hardening
Goal: Ensure reliable rollout and maintainability.

### D1. Tests
Files:
- `/Users/kunanonjarat/Desktop/Finance Platform/tests/e2e/smoke.spec.ts`
- Add new e2e spec files under `/Users/kunanonjarat/Desktop/Finance Platform/tests/e2e/`

Add tests for:
- Accounts entities
- Assets/Positions fetch flows
- Payments invoice/bill lifecycle
- Framework 1099 flow
- Report publish flow

### D2. Docs and runbooks
Files:
- `/Users/kunanonjarat/Desktop/Finance Platform/README.md`
- `/Users/kunanonjarat/Desktop/Finance Platform/cloudflare/DEPLOYMENT.md`

Update:
- API surface list
- Setup and rollout guidance for new modules

### D3. Deployment sequence
1. Apply D1 schema remotely.
2. Deploy Worker.
3. Deploy Pages.
4. Run e2e smoke tests (environment permitting DNS access to worker domain).

## 4) Suggested Sprint Breakdown

Sprint 1:
- Phase A (schema + core endpoints for Accounts/Assets/Positions)

Sprint 2:
- Phase B (Accounts/Assets/Positions frontend)
- Begin Payments backend

Sprint 3:
- Complete Payments + Reports publish + Integrations profiles
- Frameworks backend/frontend baseline

Sprint 4:
- Dashboard/Ledger enhancements (Phase C)
- Phase D hardening and test expansion

## 5) Clarifications Needed Before Coding

1. Payments scope depth:
   - Baseline CRUD for invoices/bills only, or full lifecycle (approval, settlement, reminders)?
2. Frameworks:
   - Should only 1099 be functional now, with others as read-only placeholders?
3. Integrations:
   - Are Xero/QuickBooks endpoints mock-state only initially, or should initial real sync adapters be started now?
4. Dashboard charts:
   - Is lightweight in-app chart rendering acceptable now, or do you want a specific charting library first?

## 6) Recommended Immediate Start

Start with Phase A + B (Accounts, Assets, Positions) because they are the largest functional gaps versus the updated PRD and unblock most remaining UI work.
